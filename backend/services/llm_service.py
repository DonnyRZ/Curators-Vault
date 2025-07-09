# backend/services/llm_service.py

import requests
from llama_index.llms.ollama import Ollama
from ..config import LLM_MODEL

class LLMService:
    def __init__(self):
        self._llm_model = LLM_MODEL
        self._llm = Ollama(model=self._llm_model, temperature=0.1, request_timeout=300.0)

    def get_llm(self, timeout: float = 300.0):
        return Ollama(model=self._llm_model, temperature=0.1, request_timeout=timeout)

    def get_model_name(self):
        return self._llm_model

    def get_available_models(self):
        try:
            response = requests.get("http://localhost:11434/api/tags")
            response.raise_for_status()  # Raise an exception for bad status codes
            models = response.json().get("models", [])
            return [model["name"] for model in models]
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Ollama models: {e}")
            return []

    def set_model(self, model_name: str):
        self._llm_model = model_name
        self._llm = Ollama(model=self._llm_model, temperature=0.1, request_timeout=300.0)
        # You might want to add error handling here to ensure the model is valid
        return {"message": f"LLM model updated to {model_name}"}

# Create a single, shared instance of the service
llm_service = LLMService()
