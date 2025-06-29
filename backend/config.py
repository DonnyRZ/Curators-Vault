import os
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
# This assumes your .env file is in the 'backend' directory
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

# --- LLM Configuration ---
LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:8b")

# --- Embedding Model Configuration ---
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-base-en-v1.5")

# --- Vector Store Configuration ---
VECTOR_STORE_PATH = "./vector_store"

# --- Armory Configuration ---
# Use an absolute path for the armory to ensure consistency
ARMORY_PATH = os.path.join(os.path.expanduser("~"), ".curators-atlas", "armory")
