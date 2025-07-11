
import ast
from .base_processor import BaseProcessor

class DependencyProcessor(BaseProcessor):
    """Parses a Python file to find its direct dependencies."""

    def process(self):
        """Finds all imported modules in the given Python file."""
        dependencies = set()
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            dependencies.add(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            dependencies.add(node.module)
        except Exception as e:
            print(f"Error processing dependencies for {self.file_path}: {e}")
            return []
        
        return sorted(list(dependencies))
