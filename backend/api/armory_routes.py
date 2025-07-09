import traceback
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from ..services.enrichment_service import enrich_repo, run_impact_analysis_for_repo, get_readme_summary_for_repo
from ..services.armory_service import build_armory_index, delete_repo as delete_repo_service, get_armory_index_doc_count

# Define Pydantic models for request bodies
class RepoURL(BaseModel):
    url: str

class ImpactAnalysisRequest(BaseModel):
    goal: str
    repo_url: str
    project_structure: dict

class ReadmeSummaryRequest(BaseModel):
    repo_url: str

armory_router = APIRouter()

@armory_router.get('/doc_count')
async def get_armory_doc_count_route():
    """Returns the number of documents in the Armory index."""
    try:
        count = get_armory_index_doc_count()
        return {"doc_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@armory_router.post('/enrich_repo')
async def enrich_repo_route(repo: RepoURL):
    try:
        # Note: This now calls the improved service that handles incremental indexing
        enriched_data = await enrich_repo(repo.url)
        return enriched_data
    except Exception as e:
        tb = traceback.format_exc()
        print(f"Error during enrich_repo: {tb}")
        raise HTTPException(status_code=500, detail=str(e))

@armory_router.post('/build_armory_index')
async def build_armory_index_route():
    try:
        # This is a long-running task and should ideally be run in the background
        build_armory_index()
        return {"message": "Armory index build process started."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@armory_router.post('/run_impact_analysis')
async def run_impact_analysis_route(request: ImpactAnalysisRequest):
    try:
        analysis = await run_impact_analysis_for_repo(request.goal, request.project_structure, request.repo_url)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@armory_router.post('/readme-summary')
async def readme_summary_route(request: ReadmeSummaryRequest):
    try:
        summary = await get_readme_summary_for_repo(request.repo_url)
        if summary:
            return {"summary": summary}
        else:
            raise HTTPException(status_code=404, detail="Could not generate README summary.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@armory_router.delete('/delete_repo')
async def delete_repo_route(repo: RepoURL):
    try:
        delete_repo_service(repo.url)
        return {"message": f"Repository {repo.url} deleted successfully."}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")
