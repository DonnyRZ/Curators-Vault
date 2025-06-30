from flask import Blueprint, request, jsonify
from services.enrichment_service import enrich_repo, run_impact_analysis_for_repo
from services.armory_service import build_armory_index

armory_bp = Blueprint('armory', __name__)

@armory_bp.route('/enrich_repo', methods=['POST'])
def enrich_repo_route():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    repo_url = data.get('url')

    if not repo_url:
        return jsonify({"error": "Missing 'url' in request body"}), 400

    try:
        enriched_data = enrich_repo(repo_url)
        # After successful enrichment, rebuild the armory index
        build_armory_index()
        return jsonify(enriched_data), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@armory_bp.route('/build_armory_index', methods=['POST'])
def build_armory_index_route():
    try:
        build_armory_index()
        return jsonify({"message": "Armory index built successfully."}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@armory_bp.route('/run_impact_analysis', methods=['POST'])
def run_impact_analysis_route():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    goal = data.get('goal')
    repo_url = data.get('repo_url')
    project_structure = data.get('project_structure')

    if not goal or not repo_url or not project_structure:
        return jsonify({"error": "Missing 'goal', 'repo_url', or 'project_structure' in request body"}), 400

    try:
        analysis = run_impact_analysis_for_repo(goal, project_structure, repo_url)
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@armory_bp.route('/delete_repo', methods=['DELETE'])
def delete_repo_route():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400

    data = request.get_json()
    repo_url = data.get('repo_url')

    if not repo_url:
        return jsonify({"error": "Missing 'repo_url' in request body"}), 400

    try:
        from services.armory_service import delete_repo
        delete_repo(repo_url)
        return jsonify({"message": f"Repository {repo_url} deleted successfully."}), 200
    except FileNotFoundError:
        return jsonify({"error": f"Repository {repo_url} not found."}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500