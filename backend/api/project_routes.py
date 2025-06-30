# backend/api/project_routes.py

from flask import Blueprint, request, jsonify
from services.scanner_service import scan_directory
from services.armory_service import query_armory_index
from services.codebase_service import initialize_codebase_vector_store, query_codebase_vector_store
import os
import json

# Define the path to projects.json
PROJECTS_FILE = os.path.join(os.path.expanduser("~"), ".curators-atlas", "projects.json")

# Create a Blueprint which is a way to organize a group of related routes.
# 'project' will be the name we use to refer to this blueprint.
project_bp = Blueprint('project', __name__)

@project_bp.route('/scan_project', methods=['POST'])
def scan_project_route():
    """
    API endpoint to scan a local project directory.
    Expects a JSON payload with a "path" key.
    e.g., {"path": "/home/spiderman/dev/my-project"}
    """
    # Check if the request contains JSON data
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    project_path = data.get('path')

    # Validate that the 'path' was provided
    if not project_path:
        return jsonify({"error": "Missing 'path' in request body"}), 400
        
    # Security check: Ensure the path is absolute. This prevents a user
    # from accidentally scanning weird relative paths like '../../'.
    if not os.path.isabs(project_path):
        return jsonify({"error": "Path must be an absolute path"}), 400

    # Call our service function to do the actual work
    try:
        tree_structure = scan_directory(project_path)
        
        # Check if the service returned an error (like an invalid path)
        if "error" in tree_structure:
            return jsonify(tree_structure), 404 # 404 Not Found is appropriate

        # If everything is successful, return the file tree
        return jsonify(tree_structure), 200

    except Exception as e:
        # Catch any other unexpected errors during the scan
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

@project_bp.route('/find_solution_candidates', methods=['POST'])
def find_solution_candidates_route():
    """
    API endpoint to find solution candidates based on a user's goal.
    """
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    goal = data.get('goal')

    if not goal:
        return jsonify({"error": "Missing 'goal' in request body"}), 400

    try:
        candidates = query_armory_index(goal)
        return jsonify(candidates), 200
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500