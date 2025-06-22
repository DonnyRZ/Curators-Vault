# dashboard.py

import sqlite3
import json
from flask import Flask, jsonify, render_template, request

# --- Configuration ---
# Ensure this path is correct, pointing to your database file.
# It assumes dashboard.py is in the root and the DB is one level down.
DATABASE_PATH = 'curators_vault.db'

app = Flask(__name__, static_folder='static', template_folder='templates')

# --- Database Helper ---
def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- Main Route to Serve the HTML Shell ---
@app.route('/')
def index():
    """Serves the main index.html file which contains the JavaScript app."""
    return render_template('index.html')

# =================================================================
# API ENDPOINTS FOR THE IGNITION DECK
# =================================================================

# --- Phase 1, Feature 1: The Project Hub API ---
@app.route('/api/projects', methods=['GET'])
def get_projects():
    """
    Supercharged endpoint for the Project Hub.
    Fetches all projects and calculates live stats for each one.
    """
    conn = get_db_connection()
    # This query joins projects with posts to get the count and the latest post date.
    # LEFT JOIN is used to include projects that have 0 posts.
    projects_rows = conn.execute('''
        SELECT 
            p.id, 
            p.name, 
            p.description,
            COUNT(posts.id) as idea_count,
            MAX(posts.created_at) as last_spark_timestamp
        FROM projects p
        LEFT JOIN posts ON posts.project_id = p.id
        GROUP BY p.id, p.name, p.description
        ORDER BY last_spark_timestamp DESC, p.name
    ''').fetchall()
    conn.close()
    
    projects = [dict(row) for row in projects_rows]
    return jsonify(projects)

# --- Phase 1, Feature 2: The Workshop View API ---
@app.route('/api/project/<int:project_id>', methods=['GET'])
def get_posts_for_project(project_id):
    """
    Fetches all posts associated with a specific project for the Idea Stream.
    Includes the new 'resources' and 'avatar_url' fields.
    """
    conn = get_db_connection()
    
    # Special case for "Uncategorized Ideas" (ID 1) to also include posts with no project
    if project_id == 1:
        posts_rows = conn.execute(
            "SELECT * FROM posts WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC", 
            (project_id,)
        ).fetchall()
    else:
        posts_rows = conn.execute(
            "SELECT * FROM posts WHERE project_id = ? ORDER BY created_at DESC", 
            (project_id,)
        ).fetchall()
        
    conn.close()
    posts = [dict(row) for row in posts_rows]
    return jsonify(posts)

# --- Phase 1, Feature 3: The Spark Board Persistence API ---
@app.route('/api/project/<int:project_id>/layout', methods=['GET', 'POST'])
def handle_layout(project_id):
    """
    Handles both fetching and saving the layout for the Spark Board.
    """
    conn = get_db_connection()
    
    if request.method == 'GET':
        sparks = conn.execute("SELECT * FROM sparks WHERE project_id = ?", (project_id,)).fetchall()
        connections = conn.execute("SELECT * FROM connections WHERE project_id = ?", (project_id,)).fetchall()
        conn.close()
        return jsonify({
            'sparks': [dict(row) for row in sparks],
            'connections': [dict(row) for row in connections]
        })

    if request.method == 'POST':
        layout_data = request.get_json()
        sparks_data = layout_data.get('sparks', [])
        connections_data = layout_data.get('connections', [])
        
        cursor = conn.cursor()
        
        # Use a transaction to ensure all or nothing is saved
        try:
            # Clear the old layout for this project
            cursor.execute("DELETE FROM connections WHERE project_id = ?", (project_id,))
            cursor.execute("DELETE FROM sparks WHERE project_id = ?", (project_id,))
            
            # Save new sparks and map their old (frontend) ID to their new (database) ID
            spark_id_map = {}
            for spark in sparks_data:
                cursor.execute(
                    "INSERT INTO sparks (project_id, post_id, x_pos, y_pos) VALUES (?, ?, ?, ?)",
                    (project_id, spark['post_id'], spark['x_pos'], spark['y_pos'])
                )
                new_spark_id = cursor.lastrowid
                spark_id_map[spark['id']] = new_spark_id

            # Save new connections using the new database IDs
            for conn_data in connections_data:
                start_id = spark_id_map.get(conn_data['start_spark_id'])
                end_id = spark_id_map.get(conn_data['end_spark_id'])
                if start_id and end_id:
                    cursor.execute(
                        "INSERT INTO connections (project_id, start_spark_id, end_spark_id, label) VALUES (?, ?, ?, ?)",
                        (project_id, start_id, end_id, conn_data.get('label'))
                    )
            
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Layout saved.'}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500
        finally:
            conn.close()

# --- Optional: API to create a new project from the dashboard ---
@app.route('/api/projects/new', methods=['POST'])
def create_project():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')

    if not name:
        return jsonify({'status': 'error', 'message': 'Project name is required.'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO projects (name, description) VALUES (?, ?)", (name, description))
        new_project_id = cursor.lastrowid
        conn.commit()
        return jsonify({'status': 'success', 'id': new_project_id, 'name': name}), 201
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': 'A project with this name already exists.'}), 409
    finally:
        conn.close()


if __name__ == '__main__':
    # Use debug=True for development, which enables auto-reloading
    app.run(debug=True, port=5001)