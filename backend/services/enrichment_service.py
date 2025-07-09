import os
import json
import asyncio
import httpx
from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from llama_index.core.schema import Document
from pydantic import BaseModel, Field
from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.program import LLMTextCompletionProgram

from .cache_manager import cache_manager
from .llm_service import llm_service
from .armory_service import add_repo_to_index, query_armory_index as query_armory, get_armory_document
from .codebase_service import query_codebase_vector_store
from .llm_programs import ImpactAnalysis, get_impact_analysis_llm_program, ReadmeSummary, get_readme_summary_llm_program
from ..config import ARMORY_PATH

# (Pydantic models like BriefingCard remain the same)
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


def get_llm_program(pydantic_model):
    """Creates a LlamaIndex program to generate structured output for a given Pydantic model."""
    llm = llm_service.get_llm()
    output_parser = PydanticOutputParser(pydantic_model)
    prompt_template_str = """Analyze the following technical context from a GitHub repository to generate a detailed Briefing Card.

    **Repository Context:**
    ---------------------
    {repo_context}
    ---------------------

    **Instructions:**
    Based on the provided context (which includes README, dependency files, etc.), extract and synthesize the information required by the Pydantic model.
    Fill out the JSON object precisely. Do not include any preamble or extra text.
    """
    prompt = PromptTemplate(prompt_template_str, output_parser=output_parser)
    return LLMTextCompletionProgram.from_defaults(
        output_parser=output_parser,
        output_cls=pydantic_model,
        prompt=prompt,
        llm=llm,
        verbose=True
    )

async def fetch_github_file_content(client: httpx.AsyncClient, repo_url: str, file_path: str) -> Optional[str]:
    """
    Fetches the content of a specific file from a GitHub repository asynchronously.
    """
    cache_data = {"repo_url": repo_url, "file_path": file_path}
    if cached := cache_manager.get_cached_response(cache_data, "github_file"):
        return cached.get("content")

    repo_path = repo_url.replace("https://github.com/", "")
    branch_names = ["main", "master", "develop"]
    
    for branch in branch_names:
        raw_url = f"https://raw.githubusercontent.com/{repo_path}/{branch}/{file_path}"
        try:
            response = await client.get(raw_url, timeout=15.0)
            if response.status_code == 200:
                print(f"Successfully fetched {file_path} from branch '{branch}'")
                content = response.text
                cache_manager.save_to_cache(cache_data, {"content": content}, "github_file")
                return content
        except httpx.RequestError as e:
            print(f"Async request failed for {raw_url}: {e}")
            continue
            
    print(f"Warning: Could not fetch {file_path} from the repository after trying all branches.")
    return None

async def enrich_repo(repo_url: str):
    """
    Fetches key technical files, analyzes them with an LLM, saves the briefing card,
    and incrementally updates the armory index.
    """
    print(f"Starting API-based technical enrichment for: {repo_url}")
    repo_name = repo_url.split('/')[-1]

    context_files = [
        "README.md", "readme.md", "README.rst",
        "requirements.txt", "pyproject.toml",
        "package.json", "pom.xml", "build.gradle",
        "Dockerfile", "docker-compose.yml", "Cargo.toml"
    ]
    
    repo_context = f"Repository: {repo_name}\nURL: {repo_url}\n\n"
    print("Fetching key technical files concurrently via API...")
    
    async with httpx.AsyncClient() as client:
        tasks = [fetch_github_file_content(client, repo_url, filename) for filename in context_files]
        contents = await asyncio.gather(*tasks)
    
    not_found_files = []
    for filename, content in zip(context_files, contents):
        if content:
            repo_context += f"--- Content of {filename} ---\n{content}\n\n"
        else:
            not_found_files.append(filename)

    if not_found_files:
        print(f"INFO: For repo '{repo_name}', the following optional files were not found: {', '.join(not_found_files)}")
    
    if len(repo_context) > 8000:
        repo_context = repo_context[:8000]

    print("Generating Briefing Card with LLM...")
    program = get_llm_program(BriefingCard)
    briefing_card = await program.acall(repo_context=repo_context)

    os.makedirs(ARMORY_PATH, exist_ok=True)
    filename = os.path.join(ARMORY_PATH, f"{repo_url.replace('/', '_').replace(':', '_')}.json")

    card_data = briefing_card.dict()
    card_data['url'] = repo_url

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(card_data, f, ensure_ascii=False, indent=4)
    
    print(f"Successfully enriched and saved to: {filename}")
    
    # --- Incremental Index Update ---
    print(f"Adding new repo to Armory index incrementally for URL: {repo_url}...")
    add_repo_to_index(card_data)
    
    return card_data

async def fetch_readme_content(repo_url: str) -> str:
    """
    Fetches README content asynchronously with retries.
    """
    async with httpx.AsyncClient() as client:
        return await fetch_github_file_content(client, repo_url, "README.md") or \
               await fetch_github_file_content(client, repo_url, "readme.md") or ""

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(httpx.ReadTimeout) # Only retry on ReadTimeout
)
async def _run_impact_analysis_llm_call(goal: str, project_structure: dict, readme_content: str, repo_url: str):
    program = get_impact_analysis_llm_program()
    analysis = await program.acall(
        goal_text=goal,
        project_structure=project_structure,
        readme_content=readme_content,
        repo_url=repo_url
    )
    return analysis

async def run_impact_analysis_for_repo(goal: str, project_structure: dict, repo_url: str):
    """Runs impact analysis asynchronously for a single repository."""
    print(f"Running impact analysis for {repo_url}...")

    cache_data = {"goal": goal, "project_structure": project_structure, "repo_url": repo_url}
    if cached := cache_manager.get_cached_response(cache_data, "impact_analysis"):
        return cached

    print(f"Attempting to retrieve Armory document for URL: {repo_url}")
    armory_document = get_armory_document(repo_url)
    if not armory_document:
        raise ValueError("Failed to fetch Armory document for impact analysis.")

    # Construct a concise summary from the Armory document's metadata
    metadata = armory_document.metadata
    concise_readme_content = f"Repo Name: {metadata.get('repo_name', '')}\n"
    concise_readme_content += f"One-Liner: {metadata.get('one_liner', '')}\n"
    concise_readme_content += f"Primary Use Case: {metadata.get('primary_use_case', '')}\n"
    concise_readme_content += f"Key Dependencies: {', '.join(metadata.get('key_dependencies', []))}\n"
    concise_readme_content += f"Capability Tags: {', '.join(metadata.get('capability_tags', []))}"

    MAX_LLM_INPUT_LENGTH = 1000 # Further reduce input for LLM
    truncated_project_structure = json.dumps(project_structure, indent=2)[:MAX_LLM_INPUT_LENGTH]

    try:
        analysis = await _run_impact_analysis_llm_call(
            goal=goal,
            project_structure=truncated_project_structure,
            readme_content=concise_readme_content,
            repo_url=repo_url
        )
        
        analysis_data = analysis.dict()
        analysis_data['url'] = repo_url
        analysis_data['repo_name'] = metadata.get('repo_name')
        cache_manager.save_to_cache(cache_data, analysis_data, "impact_analysis")
        return analysis_data
    except Exception as e:
        import traceback
        print(f"Error during impact analysis LLM call: {e}")
        traceback.print_exc()
        # Fallback / Graceful Degradation
        print(f"Falling back for {repo_url} due to LLM error.")
        fallback_analysis = {
            "repo_name": metadata.get('repo_name', repo_url.split('/')[-1]),
            "url": repo_url,
            "integration_cost": "Unknown",
            "integration_justification": f"LLM analysis failed: {e}",
            "capability_boost": "Unknown",
            "capability_justification": f"LLM analysis failed: {e}"
        }
        cache_manager.save_to_cache(cache_data, fallback_analysis, "impact_analysis")
        return fallback_analysis

async def get_readme_summary_for_repo(repo_url: str) -> Optional[str]:
    """
    Generates a concise summary of a repo's README asynchronously.
    """
    print(f"Generating README summary for: {repo_url}")
    
    cache_data = {"repo_url": repo_url}
    if cached := cache_manager.get_cached_response(cache_data, "readme_summary"):
        return cached.get("summary")

    readme_content = await fetch_readme_content(repo_url)
    if not readme_content:
        print(f"Warning: Could not fetch README for summary for {repo_url}.")
        return None

    truncated_readme = readme_content[:8000]

    try:
        program = get_readme_summary_llm_program()
        summary_output = await program.acall(readme_content=truncated_readme)
        
        summary_text = summary_output.summary
        cache_manager.save_to_cache(cache_data, {"summary": summary_text}, "readme_summary")
        return summary_text
    except Exception as e:
        print(f"Error during README summary LLM call for {repo_url}: {e}")
        return None


