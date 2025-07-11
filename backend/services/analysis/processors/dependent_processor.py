
from .base_processor import BaseProcessor
from ...codebase_service import query_codebase_vector_store
import os

class DependentProcessor(BaseProcessor):
    """Uses RAG to find which files in the project depend on this file."""

    def process(self):
        """Finds all files that import the current file."""
        dependents = set()
        module_name = os.path.splitext(os.path.basename(self.file_path))[0]
        
        # Construct a precise query to find import statements
        # This is a simplified example. A more robust solution would handle various import styles.
        query = f'from .{module_name} import|import {module_name}'

        try:
            search_results = query_codebase_vector_store(self.project_path, query, top_k=10)
            for result in search_results:
                # Avoid self-references
                if result['file_path'] != self.file_path:
                    dependents.add(result['file_path'])
        except Exception as e:
            print(f"Error processing dependents for {self.file_path}: {e}")
            return []

        return sorted(list(dependents))
