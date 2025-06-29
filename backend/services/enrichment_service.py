import os
import json
import requests
from bs4 import BeautifulSoup
from llama_index.llms.ollama import Ollama
from llama_index.core import Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.program import LLMTextCompletionProgram
from pydantic import BaseModel, Field
from typing import List

# Import configuration
from config import LLM_MODEL, EMBED_MODEL, ARMORY_PATH
from services.codebase_service import query_codebase_vector_store

# --- Pydantic Models for Structured Output ---
class BriefingCard(BaseModel):
    """The Vibe-Coder's Briefing Card for a GitHub repository."""
    one_liner: str = Field(description="A single, compelling sentence summarizing the repository's purpose.")
    eli5: str = Field(description="An 'Explain Like I'm 5' description of what the tool does.")
    capability_tags: List[str] = Field(description="A list of 3-5 short, descriptive tags for the repository's capabilities (e.g., #search, #AI, #database).")
    starter_prompt: str = Field(description="A sample prompt a user could give to an LLM to start using this tool.")

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
    """Creates a LlamaIndex program to generate structured output."""
    llm = Ollama(model=LLM_MODEL, temperature=0.1, request_timeout=300.0) # Set timeout to 120 seconds
    output_parser = PydanticOutputParser(pydantic_model)
    prompt_template_str = """Analyze the following README content and generate a Vibe-Coder's Briefing Card.

    **README Content:**
    ---------------------
    {readme_content}
    ---------------------

    **Instructions:**
    Based on the content, provide the following information in a clean JSON format. Do not include any preamble or extra text outside of the JSON object.

    **JSON Output Format:**
    {{ "one_liner": "A single, compelling sentence summarizing the repository's purpose.", "eli5": "An 'Explain Like I'm 5' description of what the tool does.", "capability_tags": ["#tag1", "#tag2", "#tag3"], "starter_prompt": "A sample prompt a user could give to an LLM to start using this tool." }}
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

def fetch_readme_content(repo_url: str) -> str:
    """Fetches and parses the README content from a GitHub repository URL."""
    try:
        response = requests.get(repo_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        readme_article = soup.find('article', class_="markdown-body entry-content container-lg")
        if not readme_article:
            return "Could not find README content."
        return readme_article.get_text(separator='\n', strip=True)
    except requests.RequestException as e:
        print(f"Error fetching URL {repo_url}: {e}")
        return None

def enrich_repo(repo_url: str):
    """Fetches a GitHub repo's README, analyzes it with an LLM, and saves the structured output."""
    print(f"Starting enrichment for: {repo_url}")
    readme_content = fetch_readme_content(repo_url)
    if not readme_content:
        raise ValueError("Failed to fetch or parse README content.")

    program = get_llm_program(BriefingCard)
    briefing_card = program(readme_content=readme_content)

    # Ensure the armory directory exists
    os.makedirs(ARMORY_PATH, exist_ok=True)
    filename = os.path.join(ARMORY_PATH, f"{repo_url.replace('/', '_').replace(':', '_')}.json")

    # Add the URL to the data before saving
    card_data = briefing_card.dict()
    card_data['url'] = repo_url

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(card_data, f, ensure_ascii=False, indent=4)
    
    print(f"Successfully enriched and saved: {filename}")
    return card_data

def run_impact_analysis_for_repo(goal: str, project_structure: dict, repo_url: str):
    """Runs impact analysis for a single repository."""
    print(f"Running impact analysis for {repo_url}...")
    readme_content = fetch_readme_content(repo_url)
    if not readme_content:
        raise ValueError("Failed to fetch README for impact analysis.")

    program = get_llm_program(ImpactAnalysis)
    analysis = program(
        goal_text=goal,
        project_structure=json.dumps(project_structure, indent=2),
        readme_content=readme_content,
        repo_url=repo_url # Pass the URL to the prompt context
    )
    
    analysis_data = analysis.dict()
    analysis_data['url'] = repo_url # Ensure URL is in the final output
    return analysis_data

def get_relevant_armory_repos(goal: str, top_n: int = 2) -> List[dict]:
    """
    Retrieves and re-fetches relevant Armory repositories based on the goal.
    """
    relevant_repos = []
    goal_keywords = goal.lower().split()

    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    card_data = json.load(f)
                
                # Simple keyword matching for relevance
                relevance_score = 0
                text_to_search = (card_data.get('one_liner', '') + " " +
                                  card_data.get('eli5', '')).lower()
                
                for keyword in goal_keywords:
                    if keyword in text_to_search:
                        relevance_score += 1
                
                for tag in card_data.get('capability_tags', []):
                    for keyword in goal_keywords:
                        if keyword in tag.lower():
                            relevance_score += 1

                if relevance_score > 0:
                    card_data['relevance_score'] = relevance_score
                    relevant_repos.append(card_data)
                print(f"[DEBUG] Processed {filename}: One-liner='{card_data.get('one_liner', '')}', Tags={card_data.get('capability_tags', [])}, Score={relevance_score}")
            except Exception as e:
                print(f"[DEBUG] Error reading or parsing armory file {filepath}: {e}")
    
    # Sort by relevance score and get top_n
    relevant_repos = sorted(relevant_repos, key=lambda x: x.get('relevance_score', 0), reverse=True)[:top_n]
    print(f"[DEBUG] Top {top_n} relevant repos after sorting: {[r.get('url') for r in relevant_repos]}")

    # Re-fetch README content for the top relevant repos
    for repo in relevant_repos:
        repo_url = repo.get('url')
        if repo_url:
            print(f"Re-fetching README for {repo_url}...")
            repo['full_readme'] = fetch_readme_content(repo_url)
        else:
            repo['full_readme'] = "README content not available (URL missing)."
    
    return relevant_repos

def find_solutions(goal: str, project_path: str):
    """
    Finds solutions by leveraging codebase context and armory data.
    """
    print(f"Finding solutions for goal: {goal} in project: {project_path}")
    
    # Step 1: Retrieve relevant codebase snippets
    relevant_code_snippets = query_codebase_vector_store(project_path, goal)
    
    # Step 2: Retrieve and re-fetch relevant Armory data
    relevant_armory_repos = get_relevant_armory_repos(goal)
    
    # Step 3: Construct prompt for qwen3
    prompt_parts = [
        f"User's Goal: {goal}\n",
        "--- Your Project's Relevant Code ---\n"
    ]
    
    if relevant_code_snippets:
        for snippet in relevant_code_snippets:
            prompt_parts.append(f"File: {snippet['file_path']}\n```\n{snippet['text']}\n```\n")
    else:
        prompt_parts.append("No highly relevant code snippets found in your project for this goal.\n")

    prompt_parts.append("\n--- External Tools from Armory ---\n")

    if relevant_armory_repos:
        for repo in relevant_armory_repos:
            prompt_parts.append(f"Repository Name: {repo.get('repo_name', 'N/A')}\n")
            prompt_parts.append(f"URL: {repo.get('url', 'N/A')}\n")
            prompt_parts.append(f"One-liner: {repo.get('one_liner', 'N/A')}\n")
            prompt_parts.append(f"ELI5: {repo.get('eli5', 'N/A')}\n")
            prompt_parts.append(f"Capability Tags: {', '.join(repo.get('capability_tags', []))}\n")
            prompt_parts.append(f"Integration Cost: {repo.get('integration_cost', 'N/A')}\n")
            prompt_parts.append(f"Capability Boost: {repo.get('capability_boost', 'N/A')}\n")
            prompt_parts.append(f"Full README:\n```\n{repo.get('full_readme', 'No README content available.')}\n```\n")
            prompt_parts.append("---\n")
    else:
        prompt_parts.append("No relevant external tools found in your Armory for this goal.\n")

    prompt_parts.append("\n--- Instructions for qwen3 ---\n")
    prompt_parts.append("Analyze the user's project context (provided code snippets) and their stated goal.\n")
    prompt_parts.append("Evaluate the provided external tools (based on their READMEs and summaries) in the context of the user's project.\n")
    prompt_parts.append("Recommend the 1-2 most suitable external tools for the user's specific project and goal.\n")
    prompt_parts.append("Provide a detailed justification for each recommendation, explaining *why* it's a good fit for the user's project, referencing both the local code and the external tool's capabilities.\n")
    prompt_parts.append("If applicable, briefly explain why other provided tools are *less* suitable.\n")
    prompt_parts.append("Format your response clearly with headings for recommendations and justifications.")

    full_prompt = "".join(prompt_parts)

    # Step 4: Invoke qwen3 and return recommendation
    llm = Ollama(model=LLM_MODEL, temperature=0.1, request_timeout=300.0)
    recommendation = llm.complete(full_prompt)
    
    return {"recommendation": str(recommendation), "relevant_code_snippets": relevant_code_snippets, "relevant_armory_repos": relevant_armory_repos}
