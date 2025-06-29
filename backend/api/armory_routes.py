from flask import Blueprint, request, jsonify
from services.enrichment_service import enrich_repo, run_impact_analysis_for_repo
import os
import json
import traceback # Import the traceback module
from config import ARMORY_PATH

armory_bp = Blueprint('armory', __name__)

@armory_bp.route('/enrich_repo', methods=['POST'])
def enrich_repo_route():
    data = request.get_json()
    repo_url = data.get('url')
    if not repo_url:
        return jsonify({"error": "Missing 'url' in request body"}), 400
    try:
        result = enrich_repo(repo_url)
        return jsonify(result), 200
    except Exception as e:
        print("--- ERROR DURING ENRICHMENT ---")
        traceback.print_exc()
        print("---------------------------------")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

@armory_bp.route('/find_solutions', methods=['POST'])
def find_solutions_route():
    data = request.get_json()
    goal_text = data.get('goal_text', '').lower()
    if not goal_text:
        return jsonify({"error": "Missing 'goal_text' in request body"}), 400

    solutions = []
    if not os.path.exists(ARMORY_PATH):
        return jsonify({"solutions": []})

    goal_keywords = set(goal_text.split())

    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(ARMORY_PATH, filename), 'r', encoding='utf-8') as f:
                    repo_data = json.load(f)
                    # Simple keyword search in tags
                    tags = repo_data.get('capability_tags', [])
                    for tag in tags:
                        if tag.lower().strip('#') in goal_keywords:
                            solutions.append(repo_data.get('url'))
                            break # Avoid adding the same URL multiple times
            except Exception as e:
                print(f"Error reading armory file {filename}: {e}")
                continue
    
    return jsonify({"solutions": list(set(solutions))}) # Return unique URLs

@armory_bp.route('/run_impact_analysis', methods=['POST'])
def run_impact_analysis_route():
    data = request.get_json()
    project_structure = data.get('project_structure')
    goal_text = data.get('goal_text')
    solution_urls = data.get('solution_urls')

    if not all([project_structure, goal_text, solution_urls]):
        return jsonify({"error": "Missing required fields for analysis"}), 400

    results = []
    for url in solution_urls:
        try:
            analysis = run_impact_analysis_for_repo(goal_text, project_structure, url)
            results.append(analysis)
        except Exception as e:
            print(f"--- ERROR DURING IMPACT ANALYSIS FOR {url} ---")
            traceback.print_exc()
            print("-------------------------------------------------")
            # Optionally, you could add an error status to the results
            results.append({"repo_name": url.split('/')[-1], "error": str(e), "url": url})

    return jsonify(results), 200
