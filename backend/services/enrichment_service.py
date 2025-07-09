import os
import json
import requests
import subprocess
import tempfile
import shutil
import time
from bs4 import BeautifulSoup
from services.llm_service import llm_service
from llama_index.core import Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.program import LLMTextCompletionProgram
from pydantic import BaseModel, Field
from typing import List, Optional

# Import configuration
from config import EMBED_MODEL, ARMORY_PATH
from services.codebase_service import query_codebase_vector_store

# --- Pydantic Models for Structured Output ---
class BriefingCard(BaseModel):
    """The new, technically-detailed Briefing Card for a GitHub repository."""
    repo_name: str = Field(description="The name of the repository (e.g., 'llama_index').")
    url: str = Field(description="The full URL of the GitHub repository.")
    one_liner: str = Field(description="A single, compelling sentence summarizing the repository's purpose.")
    primary_language: str = Field(description="The primary programming language of the repository (e.g., 'Python', 'TypeScript').")
    key_dependencies: Optional[List[str]] = Field(description="A list of crucial libraries or frameworks the repository depends on (e.g., ['fastapi', 'pydantic', 'torch']).")
    installation_method: Optional[str] = Field(description="The typical command or method for installing the tool (e.g., 'pip install llama-index', 'npm install').")
    primary_use_case: str = Field(description="A concise description of the main problem this repository solves or its primary function.")
    integration_points: str = Field(description="A brief explanation of how a developer would typically use or integrate this tool into their own project.")
    capability_tags: List[str] = Field(description="A list of 3-5 short, descriptive tags for the repository's capabilities (e.g., '#RAG', '#embeddings', '#quantization').")

class ImpactAnalysis(BaseModel):
    """Analysis of a specific tool's impact on a user's project."""
    repo_name: str = Field(description="The name of the repository being analyzed.")
    integration_cost: str = Field(description="A rating (Low, Medium, High) of the effort required to integrate the tool.")
    integration_justification: str = Field(description="A short sentence justifying the integration cost rating.")
    capability_boost: str = Field(description="A rating (Basic, Moderate, Exceptional) of how much the tool will improve the user's project.")
    capability_justification: str = Field(description="A short sentence justifying the capability boost rating.")
    url: str = Field(description="The URL of the repository.")

# --- Core Service Functions ---

def get_llm_program(pydantic_model):
    """Creates a LlamaIndex program to generate structured output for the BriefingCard."""
    llm = llm_service.get_llm()
    output_parser = PydanticOutputParser(pydantic_model)
    prompt_template_str = """Analyze the following technical context from a GitHub repository to generate a detailed Briefing Card.

    **Repository Context:**
    ---------------------
    {repo_context}
    ---------------------

    **Instructions:**
    Based on the provided context (which includes README, dependency files, etc.), extract and synthesize the following information.
    Fill out the JSON object according to the pydantic model. Do not include any preamble or extra text.

    **JSON Output Format:**
    {{
        "repo_name": "The name of the repository (e.g., 'llama_index').",
        "url": "The full URL of the GitHub repository.",
        "one_liner": "A single, compelling sentence summarizing the repository's purpose.",
        "primary_language": "The primary programming language of the repository (e.g., 'Python', 'TypeScript').",
        "key_dependencies": ["A list of crucial libraries or frameworks the repository depends on."],
        "installation_method": "The typical command or method for installing the tool (e.g., 'pip install llama-index').",
        "primary_use_case": "A concise description of the main problem this repository solves or its primary function.",
        "integration_points": "A brief explanation of how a developer would typically use or integrate this tool.",
        "capability_tags": ["A list of 3-5 short, descriptive tags for the repository's capabilities."]
    }}
    """
    prompt = PromptTemplate(
        prompt_template_str,
        output_parser=output_parser,
    )
    return LLMTextCompletionProgram.from_defaults(
        output_parser=output_parser,
        output_cls=pydantic_model,
        prompt=prompt,
        llm=llm,
    )

def fetch_github_file_content(repo_url: str, file_path: str) -> Optional[str]:
    """
    Fetches the content of a specific file from a GitHub repository using the raw content URL.
    Handles different branch names like main, master, etc.
    """
    repo_path = repo_url.replace("https://github.com/", "")
    
    # Common default branch names
    branch_names = ["main", "master", "develop"]
    
    for branch in branch_names:
        raw_url = f"https://raw.githubusercontent.com/{repo_path}/{branch}/{file_path}"
        try:
            response = requests.get(raw_url)
            if response.status_code == 200:
                print(f"Successfully fetched {file_path} from branch '{branch}'")
                return response.text
        except requests.RequestException as e:
            print(f"Request failed for {raw_url}: {e}")
            continue # Try the next branch name
            
    print(f"Warning: Could not fetch {file_path} from the repository.")
    return None

def enrich_repo(repo_url: str):
    """
    Fetches key technical files from a GitHub repo without cloning, 
    analyzes them, uses an LLM to generate a detailed Briefing Card, 
    and saves it to the Armory.
    """
    print(f"Starting API-based technical enrichment for: {repo_url}")
    repo_name = repo_url.split('/')[-1]

    try:
        # Step 1: Gather context from key technical files via API
        context_files = [
            "README.md", "readme.md",
            "requirements.txt", "pyproject.toml",
            "package.json", "pom.xml", "build.gradle",
            "Dockerfile", "docker-compose.yml",
            "Cargo.toml"
        ]
        
        repo_context = f"Repository: {repo_name}\nURL: {repo_url}\n\n"
        print("Fetching key technical files via API...")
        
        for filename in context_files:
            content = fetch_github_file_content(repo_url, filename)
            if content:
                repo_context += f"--- Content of {filename} ---\n{content}\n\n"
        
        if len(repo_context) < 150: # Check if we gathered any meaningful context
             raise ValueError("Could not find any key technical files (README, requirements, etc.) to analyze.")

        # Step 2: Use LLM to generate the detailed Briefing Card
        print("Generating Briefing Card with LLM...")
        program = get_llm_program(BriefingCard)
        briefing_card = program(repo_context=repo_context)

        # Step 3: Save the enriched data to the Armory
        os.makedirs(ARMORY_PATH, exist_ok=True)
        filename = os.path.join(ARMORY_PATH, f"{repo_url.replace('/', '_').replace(':', '_')}.json")

        card_data = briefing_card.dict()
        card_data['url'] = repo_url # Ensure URL is set correctly

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(card_data, f, ensure_ascii=False, indent=4)
        
        print(f"Successfully enriched and saved to: {filename}")
        return card_data

    except Exception as e:
        print(f"An error occurred during enrichment: {e}")
        raise

def get_impact_analysis_llm_program():
    """Creates a LlamaIndex program to generate structured ImpactAnalysis output."""
    llm = llm_service.get_llm()
    output_parser = PydanticOutputParser(ImpactAnalysis)
    prompt_template_str = """Analyze the following project goal, project structure, and repository README content to generate an Impact Analysis.

    **Project Goal:**
    ---------------------
    {goal_text}
    ---------------------

    **Project Structure (JSON):**
    ---------------------
    {project_structure}
    ---------------------

    **Repository README Content:**
    ---------------------
    {readme_content}
    ---------------------

    **Instructions:**
    Based on the content, provide the following information in a clean JSON format. Do not include any preamble or extra text outside of the JSON object. Ensure the repo_name and url fields are correctly extracted from the context.

    **JSON Output Format:**
    {{ "repo_name": "Name of the repo", "integration_cost": "Low|Medium|High", "integration_justification": "Short justification", "capability_boost": "Basic|Moderate|Exceptional", "capability_justification": "Short justification", "url": "URL of the repo" }}
    """
    prompt = PromptTemplate(
        prompt_template_str,
        output_parser=output_parser,
    )
    return LLMTextCompletionProgram.from_defaults(
        output_parser=output_parser,
        output_cls=ImpactAnalysis,
        prompt=prompt,
        llm=llm,
    )

def fetch_readme_content(repo_url: str) -> str:
    """
    Fetches and parses the README content from a GitHub repository URL.
    Returns an empty string if the README cannot be fetched.
    """
    retries = 3
    delay = 2
    for i in range(retries):
        try:
            # Extract owner and repo name from the URL
            parts = repo_url.split('/')
            if len(parts) < 5 or parts[2] != 'github.com':
                print(f"Warning: Not a standard GitHub URL: {repo_url}")
                return ""

            owner = parts[3]
            repo_name = parts[4]

            # Common default branch names to try
            branch_names = ["main", "master", "develop"]

            for branch in branch_names:
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo_name}/{branch}/README.md"
                try:
                    response = requests.get(raw_url, timeout=10)
                    if response.status_code == 200:
                        print(f"Successfully fetched README from {raw_url}")
                        return response.text
                    elif response.status_code == 404:
                        print(f"README not found at {raw_url}. Trying next branch...")
                    else:
                        print(f"Failed to fetch README from {raw_url}. Status: {response.status_code}")
                except requests.RequestException as e:
                    print(f"Request failed for {raw_url}: {e}")
                    continue # Try the next branch name
            
            print(f"Could not find README.md for {repo_url} after trying common branches.")
            # If we've exhausted all branches and still haven't found the README,
            # we'll retry the whole process after a delay.
            if i < retries - 1:
                print(f"Retrying fetch_readme_content in {delay} seconds...")
                time.sleep(delay)
                delay *= 2
            else:
                print("Max retries reached for fetch_readme_content.")
                return ""
        except Exception as e:
            print(f"An unexpected error occurred while fetching README for {repo_url}: {e}")
            if i < retries - 1:
                print(f"Retrying fetch_readme_content in {delay} seconds...")
                time.sleep(delay)
                delay *= 2
            else:
                print("Max retries reached for fetch_readme_content due to unexpected error.")
                return ""
    return ""

def run_impact_analysis_for_repo(goal: str, project_structure: dict, repo_url: str):
    """Runs impact analysis for a single repository."""
    print(f"Running impact analysis for {repo_url}...")
    readme_content = fetch_readme_content(repo_url)
    if not readme_content:
        raise ValueError("Failed to fetch README for impact analysis.")

    MAX_LLM_INPUT_LENGTH = 8000 # Define a maximum length for LLM inputs

    # Truncate project_structure and readme_content if they are too long
    truncated_project_structure = json.dumps(project_structure, indent=2)
    if len(truncated_project_structure) > MAX_LLM_INPUT_LENGTH:
        truncated_project_structure = truncated_project_structure[:MAX_LLM_INPUT_LENGTH] + "... (truncated)"
        print(f"Truncated project_structure to {MAX_LLM_INPUT_LENGTH} characters.")

    truncated_readme_content = readme_content
    if len(truncated_readme_content) > MAX_LLM_INPUT_LENGTH:
        truncated_readme_content = truncated_readme_content[:MAX_LLM_INPUT_LENGTH] + "... (truncated)"
        print(f"Truncated readme_content to {MAX_LLM_INPUT_LENGTH} characters.")

    retries = 3
    delay = 5
    for i in range(retries):
        try:
            program = get_impact_analysis_llm_program()
            analysis = program(
                goal_text=goal,
                project_structure=truncated_project_structure,
                readme_content=truncated_readme_content,
                repo_url=repo_url # Pass the URL to the prompt context
            )
            
            analysis_data = analysis.dict()
            analysis_data['url'] = repo_url # Ensure URL is in the final output
            return analysis_data
        except Exception as e:
            print(f"Error during impact analysis LLM call: {e}")
            if i < retries - 1:
                print(f"Retrying LLM call in {delay} seconds...")
                time.sleep(delay)
                delay *= 2
            else:
                print("Max retries reached for impact analysis LLM call.")
                raise ValueError("Failed to get impact analysis from LLM after multiple retries.")

def get_relevant_armory_repos(goal: str, top_n: int = 3) -> List[dict]:
    """
    Retrieves relevant Armory repositories based on a simple keyword match against the goal.
    """
    relevant_repos = []
    goal_keywords = set(goal.lower().split())

    if not os.path.exists(ARMORY_PATH):
        return []

    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    card_data = json.load(f)
                
                # Simple keyword matching for initial filtering
                text_to_search = (card_data.get('one_liner', '') + " " +
                                  card_data.get('primary_use_case', '')).lower()
                
                if any(keyword in text_to_search for keyword in goal_keywords):
                    relevant_repos.append(card_data)

            except Exception as e:
                print(f"Error reading or parsing armory file {filepath}: {e}")
    
    # For now, we return all relevant repos and let the LLM do the heavy lifting.
    # A future improvement would be to use vector search here.
    return relevant_repos[:top_n]

def find_solutions(goal: str, project_path: str):
    """
    Finds solutions by leveraging codebase context and the new detailed Armory data.
    """
    print(f"Finding solutions for goal: {goal} in project: {project_path}")
    
    # Step 1: Retrieve relevant codebase snippets
    relevant_code_snippets = query_codebase_vector_store(project_path, goal)
    
    # Step 2: Retrieve relevant Armory data
    relevant_armory_repos = get_relevant_armory_repos(goal)
    
    # Step 3: Construct the detailed prompt for the LLM
    prompt_parts = [
        f"User's Goal: {goal}\n",
        "--- Your Project's Relevant Code ---\n"
    ]
    
    if relevant_code_snippets:
        for snippet in relevant_code_snippets:
            prompt_parts.append(f"File: {snippet['file_path']}\n```\n{snippet['text']}\n```\n")
    else:
        prompt_parts.append("No highly relevant code snippets found in your project for this goal.\n")

    prompt_parts.append("\n--- Candidate External Tools from Armory ---\n")

    if relevant_armory_repos:
        for repo in relevant_armory_repos:
            prompt_parts.append(f"Repository: {repo.get('repo_name', 'N/A')}\n")
            prompt_parts.append(f"URL: {repo.get('url', 'N/A')}\n")
            prompt_parts.append(f"Use Case: {repo.get('primary_use_case', 'N/A')}\n")
            prompt_parts.append(f"Primary Language: {repo.get('primary_language', 'N/A')}\n")
            prompt_parts.append(f"Key Dependencies: {', '.join(repo.get('key_dependencies', []))}\n")
            prompt_parts.append(f"Installation: {repo.get('installation_method', 'N/A')}\n")
            prompt_parts.append(f"Integration Points: {repo.get('integration_points', 'N/A')}\n")
            prompt_parts.append("---\n")
    else:
        prompt_parts.append("No relevant external tools found in your Armory for this goal.\n")

    prompt_parts.append("\n--- Instructions for Language Model ---\n")
    prompt_parts.append("You are an expert Staff Engineer. Your task is to recommend the best tool for the user's goal, based on their project's code and the provided tool information.\n")
    prompt_parts.append("1. **Analyze the User's Code:** Understand the user's current implementation from the code snippets.\n")
    prompt_parts.append("2. **Evaluate Candidate Tools:** For each candidate tool, assess its technical fitness. Consider its dependencies, language, and how it would integrate with the user's existing code.\n")
    prompt_parts.append("3. **Make a Recommendation:** Recommend the single best tool for the job. Provide a clear, concise justification, explaining *why* it's the best fit technically. Reference the user's code and the tool's specific features (e.g., 'Their code uses FastAPI, and Tool X provides a direct FastAPI middleware, making integration trivial.').\n")
    prompt_parts.append("4. **Format:** Respond in clear Markdown.")

    full_prompt = "".join(prompt_parts)

    # Step 4: Invoke LLM and return recommendation
    llm = llm_service.get_llm()
    recommendation = llm.complete(full_prompt)
    
    return {"recommendation": str(recommendation), "relevant_code_snippets": relevant_code_snippets, "relevant_armory_repos": relevant_armory_repos}