# backend/main.py

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your API routers
from .api.project_routes import project_router
from .api.armory_routes import armory_router
from .api.llm_routes import llm_router

# --- Application Factory ---
def create_app():
    """Creates and configures the FastAPI application."""
    
    app = FastAPI(
        title="Curator's Atlas API",
        description="The backend engine for analyzing and finding software solutions.",
        version="1.0.0"
    )
    
    # --- CORS Configuration ---
    # This allows the frontend to make requests to this backend.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict this to your frontend's domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Include API Routers ---
    # This tells the app about all the routes defined in your API files.
    app.include_router(project_router, prefix="/api", tags=["Project"])
    app.include_router(armory_router, prefix="/api", tags=["Armory"])
    app.include_router(llm_router, prefix="/api", tags=["LLM"])

    # --- A simple health-check route ---
    @app.get("/", tags=["Health"])
    def read_root():
        return {"status": "ok", "message": "Curator's Atlas Backend is running."}

    return app

app = create_app()

# --- Main Entry Point ---
if __name__ == '__main__':
    # This block runs only when you execute 'python main.py' directly.
    # It's used for development. Uvicorn is the ASGI server that runs the app.
    uvicorn.run(app, host="0.0.0.0", port=5001)
