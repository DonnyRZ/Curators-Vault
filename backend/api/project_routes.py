from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import os

from ..services.scanner_service import scan_directory
from ..services.armory_service import query_armory_index

# Define Pydantic models for request bodies
class ScanRequest(BaseModel):
    path: str

class GoalRequest(BaseModel):
    goal: str

project_router = APIRouter()

@project_router.post("/scan_project")
async def scan_project_route(request: ScanRequest):
    """
    API endpoint to scan a local project directory.
    e.g., {"path": "/home/spiderman/dev/my-project"}
    """
    project_path = request.path
    
    if not os.path.isabs(project_path):
        raise HTTPException(status_code=400, detail="Path must be an absolute path")

    try:
        tree_structure = scan_directory(project_path, max_depth=2)
        if "error" in tree_structure:
            raise HTTPException(status_code=404, detail=tree_structure["error"])
        return tree_structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@project_router.post("/find_solution_candidates")
async def find_solution_candidates_route(request: GoalRequest):
    """
    API endpoint to find solution candidates based on a user's goal.
    """
    try:
        candidates = query_armory_index(request.goal)
        return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@project_router.post("/find_raw_solution_candidates")
async def find_raw_solution_candidates_route(request: GoalRequest):
    """
    API endpoint to find raw solution candidates based on a user's goal, including scores.
    """
    try:
        candidates = query_armory_index(request.goal)
        return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
