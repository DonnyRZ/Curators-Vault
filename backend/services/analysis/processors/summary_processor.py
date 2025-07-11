
from .base_processor import BaseProcessor
from ...llm_service import llm_service
from llama_index.core.prompts import PromptTemplate

class SummaryProcessor(BaseProcessor):
    """Uses an LLM to generate a one-sentence summary of a file."""

    def process(self):
        """Generates a summary for the file content."""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading file {self.file_path}: {e}")
            return ""

        if not content.strip():
            return "This file is empty."

        summary_prompt_str = (
            "Based on the following code, provide a concise, one-sentence summary of its primary purpose.\n"
            "---------------------\n"
            "{code_content}\n"
            "---------------------\n"
            "Summary: "
        )
        summary_prompt = PromptTemplate(summary_prompt_str)

        prompt = summary_prompt.format(code_content=content)

        llm = llm_service.get_llm()
        response = llm.complete(prompt)

        return str(response).strip()
