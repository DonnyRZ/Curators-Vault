from flask import Blueprint, request, jsonify
from services.enrichment_service import enrich_repo

armory_bp = Blueprint('armory', __name__)

@armory_bp.route('/enrich_repo', methods=['POST'])
def enrich_repo_route():
    data = request.get_json()
    repo_url = data.get('url')

    if not repo_url:
        return jsonify({"error": "Missing 'url' in request body"}), 400

    # Call our service function to do the actual work
    try:
        result = enrich_repo(repo_url)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred during enrichment: {e}"}), 500