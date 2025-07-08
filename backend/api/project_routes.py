# backend/api/project_routes.py

from flask import Blueprint, request, jsonify
from services.scanner_service import scan_directory
from services.armory_service import query_armory_index
from services.codebase_service import initialize_codebase_vector_store, query_codebase_vector_store
from services.llm_service import llm_service
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

@project_bp.route('/get_ollama_models', methods=['GET'])
def get_ollama_models_route():
    """
    API endpoint to get the list of available Ollama models.
    """
    try:
        # In a real-world scenario, you'd have a more robust way
        # of getting the models, but for this example, we'll use
        # the command line.
        import subprocess
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({"error": "Failed to get Ollama models", "details": result.stderr}), 500
        
        # The output of 'ollama list' is a table. We need to parse it.
        lines = result.stdout.strip().split('\n')
        models = []
        for line in lines[1:]:  # Skip the header row
            parts = line.split()
            if len(parts) > 0:
                models.append(parts[0])
        
        return jsonify(models), 200
    except FileNotFoundError:
        return jsonify({"error": "'ollama' command not found. Is Ollama installed and in your PATH?"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

@project_bp.route('/set_llm_model', methods=['POST'])
def set_llm_model_route():
    """
    API endpoint to set the LLM model.
    """
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    model_name = data.get('model_name')

    if not model_name:
        return jsonify({"error": "Missing 'model_name' in request body"}), 400

    try:
        result = llm_service.set_model(model_name)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500