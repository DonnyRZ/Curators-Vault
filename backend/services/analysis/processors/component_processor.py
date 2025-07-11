
from .base_processor import BaseProcessor
from ...llm_service import llm_service
from llama_index.core.prompts import PromptTemplate
import re

class ComponentProcessor(BaseProcessor):
    """Uses an LLM to identify key components (functions, classes) in a file."""

    def process(self):
        """Extracts key components from the file content."""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading file {self.file_path}: {e}")
            return []

        if not content.strip():
            return []

        components_prompt_str = (
            "Based on the following code, list the names of the key functions and classes. "
            "Format the output as a comma-separated list (e.g., function_one, ClassTwo, function_three).\n"
            "---------------------\n"
            "{code_content}\n"
            "---------------------\n"
            "Components: "
        )
        components_prompt = PromptTemplate(components_prompt_str)

        prompt = components_prompt.format(code_content=content)

        llm = llm_service.get_llm()
        response = llm.complete(prompt)

        # Clean up the LLM response
        cleaned_response = str(response).strip()
        # Split by comma and strip whitespace from each item
        components = [item.strip() for item in cleaned_response.split(',') if item.strip()]
        
        return components
