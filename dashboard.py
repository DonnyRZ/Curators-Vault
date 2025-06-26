# dashboard.py

import sqlite3
import json
from flask import Flask, jsonify, render_template, request
# --- NEW: Import our database initializer ---
from app.database import init_db

# --- Configuration ---
DATABASE_PATH = 'curators_vault.db'

app = Flask(__name__, static_folder='static', template_folder='templates')

# --- Database Helper ---
def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- Main Route to Serve the Anvil HTML Shell ---
@app.route('/')
def index():
    """Serves the main anvil.html file which will contain our JavaScript app."""
    return render_template('anvil.html')

# =================================================================
# API ENDPOINTS FOR THE PROJECT ANVIL
# =================================================================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Fetches all projects to populate the project selection list in the Anvil."""
    conn = get_db_connection()
    projects_rows = conn.execute(
        "SELECT id, name, description FROM projects ORDER BY name"
    ).fetchall()
    conn.close()
    
    projects = [dict(row) for row in projects_rows]
    return jsonify(projects)

@app.route('/api/assets', methods=['GET'])
def get_all_assets():
    """Fetches all enriched posts to populate the "Armory" in the Anvil."""
    conn = get_db_connection()
    assets_rows = conn.execute('''
        SELECT id, author, post_text, url, one_liner_summary, tags, resources
        FROM posts
        WHERE one_liner_summary IS NOT NULL 
        ORDER BY created_at DESC
    ''').fetchall()
    conn.close()
    
    assets = [dict(row) for row in assets_rows]
    return jsonify(assets)

@app.route('/api/project/<int:project_id>/blueprint', methods=['GET'])
def get_project_blueprint(project_id):
    """
    Fetches all blueprint components for a specific project.
    If a project is new and has no components, it creates a default set.
    """
    conn = get_db_connection()
    components_rows = conn.execute(
        "SELECT id, name, description, assigned_asset_id FROM blueprint_components WHERE project_id = ?",
        (project_id,)
    ).fetchall()
    
    if not components_rows and project_id != 1:
        print(f"Project {project_id} has no blueprint. Creating default components.")
        default_components = [
            {'name': 'User Interface', 'description': 'The main frontend framework and UI kit.'},
            {'name': 'Backend API', 'description': 'The server-side logic and data endpoints.'},
            {'name': 'Database', 'description': 'The primary data storage solution.'},
            {'name': 'Authentication', 'description': 'How users will log in and manage sessions.'}
        ]
        cursor = conn.cursor()
        for comp in default_components:
            cursor.execute(
                "INSERT INTO blueprint_components (project_id, name, description) VALUES (?, ?, ?)",
                (project_id, comp['name'], comp['description'])
            )
        conn.commit()
        
        components_rows = conn.execute(
            "SELECT id, name, description, assigned_asset_id FROM blueprint_components WHERE project_id = ?",
            (project_id,)
        ).fetchall()

    conn.close()
    components = [dict(row) for row in components_rows]
    return jsonify(components)


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
    # --- THIS IS THE FIX ---
    # We ensure the database is initialized and all tables are created BEFORE starting the server.
    print("Initializing database for web anvil...")
    init_db()
    
    app.run(debug=True, port=5001)