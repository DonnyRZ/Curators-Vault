# backend/api/llm_routes.py

from fastapi import APIRouter, HTTPException, Body
from ..services.llm_service import llm_service
from pydantic import BaseModel

# Define the request body model for setting the LLM
class LLMModel(BaseModel):
    model_name: str

llm_router = APIRouter()

@llm_router.get("/get_ollama_models")
async def get_ollama_models_route():
    """Endpoint to get the list of available Ollama models."""
    try:
        models = llm_service.get_available_models()
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@llm_router.post("/set_llm_model")
async def set_llm_model_route(llm_model: LLMModel):
    """Endpoint to set the LLM model."""
    try:
        model_name = llm_model.model_name
        result = llm_service.set_model(model_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")
