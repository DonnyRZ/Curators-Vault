import os
import json
import requests
from bs4 import BeautifulSoup
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.program import LLMTextCompletionProgram
from pydantic import BaseModel, Field
from typing import List

# Import configuration
from config import LLM_MODEL, EMBED_MODEL, ARMORY_PATH

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
