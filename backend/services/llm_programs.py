from pydantic import BaseModel, Field
from typing import List, Optional
from llama_index.core.prompts import PromptTemplate
from llama_index.core.output_parsers import PydanticOutputParser
from llama_index.core.program import LLMTextCompletionProgram
from .llm_service import llm_service

# --- Pydantic Models for Structured Output ---
class ImpactAnalysis(BaseModel):
    """Analysis of a specific tool's impact on a user's project."""
    integration_cost: str = Field(description="A rating (Low, Medium, High) of the effort required to integrate the tool.")
    integration_justification: str = Field(description="A short sentence justifying the integration cost rating.")
    capability_boost: str = Field(description="A rating (Basic, Moderate, Exceptional) of how much the tool will improve the user's project.")
    capability_justification: str = Field(description="A short sentence justifying the capability boost rating.")

class ReadmeSummary(BaseModel):
    """A concise summary of a GitHub repository's README content."""
    summary: str = Field(description="A concise summary of the README content, focusing on the project's purpose, key features, and how to use it.")

class SmartSummary(BaseModel):
    """A smart, condensed summary of a GitHub repository's README, focusing on technical details for impact analysis."""
    summary: str = Field(description="A condensed summary of the README, highlighting the core purpose, key technical features, setup/installation, and primary use case.")

# --- LLM Program Functions ---

def get_impact_analysis_llm_program(timeout: float = 300.0):
    """Creates a LlamaIndex program to generate structured ImpactAnalysis output."""
    llm = llm_service.get_llm(timeout=timeout)
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
    Based on the content, provide the following information in a clean JSON format. Do not include any preamble or extra text outside of the JSON object.

    **JSON Output Format:**
    {{ "integration_cost": "Low|Medium|High", "integration_justification": "Short justification", "capability_boost": "Basic|Moderate|Exceptional", "capability_justification": "Short justification" }}
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

def get_readme_summary_llm_program():
    """Creates a LlamaIndex program to generate a concise summary of a README."""
    llm = llm_service.get_llm()
    output_parser = PydanticOutputParser(ReadmeSummary)
    prompt_template_str = """Summarize the following README content concisely, focusing on the project's purpose, key features, and how to use it. Keep the summary under 200 words.

    **README Content:**
    ---------------------
    {readme_content}
    ---------------------

    **Instructions:**
    Provide the summary in a clean JSON format according to the pydantic model. Do not include any preamble or extra text outside of the JSON object.

    **JSON Output Format:**
    {{ "summary": "A concise summary of the README content." }}
    """
    prompt = PromptTemplate(
        prompt_template_str,
        output_parser=output_parser,
    )
    return LLMTextCompletionProgram.from_defaults(
        output_parser=output_parser,
        output_cls=ReadmeSummary,
        prompt=prompt,
        llm=llm,
    )

def get_smart_summary_llm_program():
    """Creates a LlamaIndex program to generate a smart, condensed summary of a README for impact analysis."""
    llm = llm_service.get_llm(timeout=120.0) # Use a faster model for summarization
    output_parser = PydanticOutputParser(SmartSummary)
    prompt_template_str = """Analyze the following README and create a condensed, technically-focused summary. Extract only the most critical information a developer would need to assess its relevance for their project. 

    **README Content:**
    ---------------------
    {readme_content}
    ---------------------

    **Instructions:**
    Focus on these key areas:
    1.  **Core Purpose:** What is the main goal of this repository?
    2.  **Key Technical Features:** What are the 2-3 most important technical capabilities or features?
    3.  **Setup/Installation:** What is the primary command or method to install and use it?
    4.  **Primary Use Case:** What specific problem does it solve?

    Condense this information into a brief summary. The summary should be dense with technical keywords and concepts.

    **JSON Output Format:**
    {{ "summary": "A condensed, technically-focused summary of the README." }}
    """
    prompt = PromptTemplate(
        prompt_template_str,
        output_parser=output_parser,
    )
    return LLMTextCompletionProgram.from_defaults(
        output_parser=output_parser,
        output_cls=SmartSummary,
        prompt=prompt,
        llm=llm,
    )
