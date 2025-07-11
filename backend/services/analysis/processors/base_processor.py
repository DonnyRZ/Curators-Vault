
from abc import ABC, abstractmethod

class BaseProcessor(ABC):
    """Abstract base class for an analysis processor."""

    def __init__(self, project_path, file_path):
        self.project_path = project_path
        self.file_path = file_path

    @abstractmethod
    def process(self):
        """Executes the processor and returns its result."""
        pass
