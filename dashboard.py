from flask import Flask, render_template, jsonify
from app.database import get_all_posts, get_all_projects

# --- Flask App Initialization ---
app = Flask(__name__)


# --- Route Definitions ---

@app.route('/')
def home():
    """Serves the main dashboard page."""
    return render_template('index.html')

@app.route('/api/projects')
def api_get_projects():
    """Fetches all projects and returns them as JSON."""
    projects_from_db = get_all_projects()
    projects_list = [dict(row) for row in projects_from_db]
    return jsonify(projects_list)

@app.route('/api/project/<int:project_id>')
def api_get_posts_for_project(project_id):
    """Fetches all posts for a given project_id and returns them as JSON."""
    # --- THIS IS THE FIX ---
    # We now correctly call the function with the named argument 'project_id'.
    posts_from_db = get_all_posts(project_id=project_id)
    
    posts_list = [dict(row) for row in posts_from_db]
    return jsonify(posts_list)


# --- Main Execution Block ---
if __name__ == '__main__':
    app.run(debug=True)