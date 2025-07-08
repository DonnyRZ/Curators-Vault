import os
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from services.llm_service import llm_service
from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.vector_stores.simple import SimpleVectorStore
from llama_index.core import StorageContext, load_index_from_storage

from config import EMBED_MODEL, VECTOR_STORE_PATH

# Configure LlamaIndex global settings for embedding and LLM
Settings.embed_model = HuggingFaceEmbedding(model_name=EMBED_MODEL)
Settings.llm = llm_service.get_llm()
Settings.node_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=20)

def initialize_codebase_vector_store(project_path: str):
    """
    Initializes or loads a vector store for the given project path.
    If the vector store already exists, it loads it. Otherwise, it creates a new one.
    """
    project_vector_store_path = os.path.join(VECTOR_STORE_PATH, os.path.basename(project_path).replace('.', '_'))
    
    if not os.path.exists(project_vector_store_path):
        print(f"Creating new vector store for project: {project_path}")
        # Load documents from the project path
        # TODO: Add a .gitignore-like mechanism to exclude irrelevant files/directories
        
        exclude_patterns = _get_gitignore_patterns(project_path)
        print(f"Excluding patterns from .gitignore: {exclude_patterns}")

        documents = SimpleDirectoryReader(
            input_dir=project_path,
            recursive=True,
            exclude=exclude_patterns
        ).load_data()
        
        # Create a new index
        index = VectorStoreIndex.from_documents(documents)
        
        # Persist the index
        index.storage_context.persist(persist_dir=project_vector_store_path)
        print(f"Vector store created and saved to: {project_vector_store_path}")
    else:
        print(f"Loading existing vector store for project: {project_path}")
        # Load the existing index
        storage_context = StorageContext.from_defaults(persist_dir=project_vector_store_path)
        index = load_index_from_storage(storage_context)
        print("Vector store loaded.")
    
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
    index = initialize_codebase_vector_store(project_path) # Ensure index is loaded/initialized
    
    query_engine = index.as_query_engine(similarity_top_k=top_k)
    response = query_engine.query(query_text)
    
    # Extract source nodes for detailed snippets
    relevant_snippets = []
    for node in response.source_nodes:
        relevant_snippets.append({
            "text": node.text,
            "file_path": node.metadata.get('file_path', 'N/A'),
            "score": node.score
        })
    return relevant_snippets
