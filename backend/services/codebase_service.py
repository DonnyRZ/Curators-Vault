import os
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from .llm_service import llm_service
from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import StorageContext, load_index_from_storage

# Import FAISS specific modules
import faiss
from llama_index.vector_stores.faiss import FaissVectorStore

from ..config import EMBED_MODEL, VECTOR_STORE_PATH

# --- Global In-Memory Cache for Codebase Indexes ---
_codebase_index_cache = {}

# Configure LlamaIndex global settings for embedding and LLM
Settings.embed_model = HuggingFaceEmbedding(model_name=EMBED_MODEL)
Settings.llm = llm_service.get_llm()
Settings.node_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=20)

def initialize_codebase_vector_store(project_path: str):
    """
    Initializes or loads a vector store for the given project path.
    It uses an in-memory cache to avoid reloading the index from disk repeatedly.
    """
    project_vector_store_path = os.path.join(VECTOR_STORE_PATH, os.path.basename(project_path).replace('.', '_'))
    
    # Check in-memory cache first
    if project_vector_store_path in _codebase_index_cache:
        print(f"Loading cached in-memory vector store for project: {project_path}")
        return _codebase_index_cache[project_vector_store_path]

    # Determine embedding dimension
    try:
        embed_dim = Settings.embed_model.embed_dim
    except AttributeError:
        print("Warning: embed_dim not found on Settings.embed_model. Defaulting to 768.")
        embed_dim = 768 # Common dimension for many sentence-transformer models

    # Initialize FAISS index (HNSWFlat for ANN) for CPU
    faiss_index = faiss.IndexHNSWFlat(embed_dim, 32) # M=32 is a common default
    vector_store = FaissVectorStore(faiss_index=faiss_index)

    if not os.path.exists(project_vector_store_path):
        print(f"Creating new vector store for project: {project_path}")
        # Load documents from the project path
        exclude_patterns = _get_gitignore_patterns(project_path)
        print(f"Excluding patterns from .gitignore: {exclude_patterns}")

        try:
            documents = SimpleDirectoryReader(
                input_dir=project_path,
                recursive=True,
                exclude=exclude_patterns
            ).load_data()
        except Exception as e:
            print(f"Error reading documents from {project_path}: {e}")
            return None # Or handle error appropriately
        
        if not documents:
            print(f"No documents found in {project_path}. Cannot create index.")
            return None

        # Create a new index with the FAISS vector store
        print("Creating index from documents with FAISS...")
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
        
        # Persist the index to disk
        print(f"Saving vector store to: {project_vector_store_path}")
        index.storage_context.persist(persist_dir=project_vector_store_path)
    else:
        print(f"Loading existing vector store from disk for project: {project_path}")
        # Load the existing index from disk
        # When loading, we need to provide the FaissVectorStore instance
        storage_context = StorageContext.from_defaults(
            vector_store=vector_store,
            persist_dir=project_vector_store_path
        )
        index = load_index_from_storage(storage_context)
        print("Vector store loaded from disk.")
    
    # Store the loaded index in the in-memory cache
    _codebase_index_cache[project_vector_store_path] = index
    print(f"Vector store for {project_path} cached in memory.")
    
    return index

def _get_gitignore_patterns(project_path: str) -> list[str]:
    """
    Reads the .gitignore file at the project root and returns a list of patterns.
    """
    gitignore_path = os.path.join(project_path, '.gitignore')
    patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    patterns.append(line)
    return patterns

def query_codebase_vector_store(project_path: str, query_text: str, top_k: int = 5):
    """
    Queries the vector store for the given project path with a natural language query.
    Returns the top_k most relevant code snippets.
    """
    index = initialize_codebase_vector_store(project_path) # This now uses the cache
    if not index:
        print(f"Index for {project_path} could not be initialized. Aborting query.")
        return []
    
    query_engine = index.as_query_engine(similarity_top_k=top_k)
    response = query_engine.query(query_text)
    
    # Extract source nodes for detailed snippets
    relevant_snippets = []
    for node in response.source_nodes:
        relevant_snippets.append({
            "text": node.get_content(), # Use get_content() for robustness
            "file_path": node.metadata.get('file_path', 'N/A'),
            "score": node.score
        })
    return relevant_snippets