import os
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
# This assumes your .env file is in the 'backend' directory
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

# --- LLM Configuration ---
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3n:e4b")

# --- Embedding Model Configuration ---
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")

# --- Vector Store Configuration ---
VECTOR_STORE_PATH = "./vector_store"

# --- Armory Configuration ---
# Use an absolute path for the armory to ensure consistency
ARMORY_PATH = "./armory"
ARMORY_INDEX_PATH = "./armory_index"

# --- Cache Configuration ---
# Type can be 'redis' or 'in-memory'
CACHE_TYPE = os.getenv("CACHE_TYPE", "in-memory")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
