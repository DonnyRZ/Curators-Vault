import os
import json
import hashlib
from llama_index.core import Document, VectorStoreIndex, StorageContext, load_index_from_storage
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from .llm_service import llm_service
from llama_index.core import Settings

# Import FAISS specific modules
import faiss
from llama_index.vector_stores.faiss import FaissVectorStore

from ..config import ARMORY_PATH, ARMORY_INDEX_PATH, EMBED_MODEL

# --- Global In-Memory Cache for the Index ---
_armory_index = None

# Configure LlamaIndex global settings
Settings.embed_model = HuggingFaceEmbedding(model_name=EMBED_MODEL)
Settings.llm = llm_service.get_llm()
Settings.node_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=20)

def _get_doc_id(repo_url: str) -> str:
    """Generates a consistent and unique document ID from the repository URL."""
    print(f"Generating doc_id for repo_url: '{repo_url}'")
    return hashlib.md5(repo_url.encode('utf-8')).hexdigest()

def _get_faiss_vector_store():
    """Helper to initialize a FaissVectorStore with IndexHNSWFlat for CPU."""
    # Determine embedding dimension
    try:
        embed_dim = Settings.embed_model.embed_dim
    except AttributeError:
        print("Warning: embed_dim not found on Settings.embed_model. Defaulting to 768.")
        embed_dim = 768 # Common dimension for many sentence-transformer models

    # Initialize FAISS index (HNSWFlat for ANN) for CPU
    faiss_index = faiss.IndexHNSWFlat(embed_dim, 32) # M=32 is a common default
    return FaissVectorStore(faiss_index=faiss_index)

def build_armory_index():
    """
    Builds a vector store index from scratch from all JSON files in the Armory.
    This is a heavy operation and should be used for initial setup or full rebuilds.
    """
    global _armory_index
    print("Building Armory index from scratch...")
    if os.path.exists(ARMORY_INDEX_PATH):
        import shutil
        print(f"Deleting existing Armory index at {ARMORY_INDEX_PATH}...")
        shutil.rmtree(ARMORY_INDEX_PATH)

    if not os.path.exists(ARMORY_PATH):
        os.makedirs(ARMORY_PATH)
        print(f"Created Armory path: {ARMORY_PATH}")
        # Create empty index with FAISS vector store
        vector_store = _get_faiss_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        _armory_index = VectorStoreIndex.from_documents([], storage_context=storage_context)
        _armory_index.storage_context.persist(persist_dir=ARMORY_INDEX_PATH)
        return

    documents = []
    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                repo_url = data.get('url')
                if not repo_url:
                    print(f"Skipping file {filepath} as it lacks a URL.")
                    continue

                doc_text = f"Repo: {data.get('repo_name', '')}\nUse Case: {data.get('primary_use_case', '')}\nOne Liner: {data.get('one_liner', '')}\nTags: {', '.join(data.get('capability_tags', []))}"
                document = Document(
                    text=doc_text,
                    id_=_get_doc_id(repo_url),
                    metadata={
                        "url": repo_url,
                        "repo_name": data.get('repo_name')
                    }
                )
                documents.append(document)
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")

    # Create a new index with the FAISS vector store
    vector_store = _get_faiss_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)

    index.storage_context.persist(persist_dir=ARMORY_INDEX_PATH)
    _armory_index = index
    print(f"Armory index built, saved to {ARMORY_INDEX_PATH}, and loaded into memory.")

def load_armory_index():
    """Loads the armory index from disk into memory if it exists, or builds it if it doesn't."""
    global _armory_index
    if _armory_index is not None:
        return # Already loaded

    if os.path.exists(ARMORY_INDEX_PATH):
        try:
            print("Loading Armory index from disk into memory...")
            # When loading, we need to provide the FaissVectorStore instance
            vector_store = _get_faiss_vector_store()
            storage_context = StorageContext.from_defaults(
                vector_store=vector_store,
                persist_dir=ARMORY_INDEX_PATH
            )
            _armory_index = load_index_from_storage(storage_context)
            print("Armory index loaded into memory.")
            print(f"Documents in docstore after loading: {len(_armory_index.docstore.docs)}")
            # Print first 5 doc_ids for inspection
            for i, doc_id in enumerate(_armory_index.docstore.docs.keys()):
                if i >= 5:
                    break
                print(f"  Sample doc_id: {doc_id}")
        except Exception as e:
            print(f"Error loading Armory index: {e}. Triggering a rebuild.")
            build_armory_index()
    else:
        print("Armory index not found on disk. Triggering a new build.")
        build_armory_index()

def add_repo_to_index(repo_data: dict):
    """Incrementally adds a new repository document to the index."""
    global _armory_index
    load_armory_index() # Ensure index is loaded

    repo_url = repo_data.get('url')
    if not repo_url:
        print("Cannot add repo to index: missing URL.")
        return

    doc_text = f"Repo: {repo_data.get('repo_name', '')}\nUse Case: {repo_data.get('primary_use_case', '')}\nOne Liner: {repo_data.get('one_liner', '')}\nTags: {', '.join(repo_data.get('capability_tags', []))}"
    document = Document(
        text=doc_text,
        id_=_get_doc_id(repo_url),
        metadata={
            "url": repo_url,
            "repo_name": repo_data.get('repo_name')
        }
    )
    
    try:
        _armory_index.insert(document)
        _armory_index.storage_context.persist(persist_dir=ARMORY_INDEX_PATH)
        print(f"Incrementally added {repo_url} to index and persisted changes.")
    except Exception as e:
        print(f"Error inserting document into index: {e}. Rebuilding for consistency.")
        build_armory_index()

def delete_repo(repo_url: str):
    """
    Deletes a repository's JSON file and removes its document from the vector index.
    """
    global _armory_index
    print(f"Attempting to delete repository: {repo_url}")

    # Find and delete the source JSON file
    deleted_file = False
    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get('url') == repo_url:
                        os.remove(filepath)
                        print(f"Deleted source file {filepath}")
                        deleted_file = True
                        break
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")
    
    if not deleted_file:
        raise FileNotFoundError(f"Repository with URL {repo_url} not found in Armory source files.")

    load_armory_index() # Ensure index is loaded

    doc_id = _get_doc_id(repo_url)
    try:
        _armory_index.delete_ref_doc(doc_id, delete_from_docstore=True)
        _armory_index.storage_context.persist(persist_dir=ARMORY_INDEX_PATH)
        print(f"Removed document {doc_id} from index and persisted changes.")
    except Exception as e:
        print(f"Could not delete doc_id {doc_id} from index: {e}. Rebuilding to ensure consistency.")
        build_armory_index()

    print(f"Repository {repo_url} deleted successfully.")

def query_armory_index(query_text: str, top_k: int = 3) -> list[dict]:
    """
    Queries the in-memory Armory index to find the most relevant tools.
    """
    global _armory_index
    load_armory_index() # Ensure index is loaded before querying
    
    if len(_armory_index.docstore.docs) == 0:
        print("Armory index is empty. Cannot query.")
        return []

    try:
        query_engine = _armory_index.as_query_engine(similarity_top_k=top_k)
        response = query_engine.query(query_text)

        results = []
        for node in response.source_nodes:
            results.append({
                "repo_name": node.metadata.get('repo_name'),
                "url": node.metadata.get('url'),
                "score": node.score
            })
        return results
    except Exception as e:
        print(f"Error querying Armory index: {e}")
        return []

def get_armory_index_doc_count() -> int:
    """
    Returns the number of documents currently in the in-memory Armory index.
    """
    global _armory_index
    load_armory_index() # Ensure index is loaded
    if _armory_index is None:
        return 0
    return len(_armory_index.docstore.docs)

def get_armory_document(repo_url: str) -> Document | None:
    """
    Retrieves a specific document/node from the Armory index by its URL by searching 
    for the correct ref_doc_id. The returned object is technically a Node, but it
    is duck-typed compatible with the Document for the purposes of this application.
    """
    global _armory_index
    load_armory_index()

    ref_doc_id_to_find = _get_doc_id(repo_url)
    print(f"Attempting to retrieve node with ref_doc_id: {ref_doc_id_to_find} for repo_url: {repo_url}")

    try:
        # Iterate through the nodes in the docstore to find the one with the matching ref_doc_id.
        for node in _armory_index.docstore.docs.values():
            if hasattr(node, 'ref_doc_id') and node.ref_doc_id == ref_doc_id_to_find:
                print(f"Successfully found matching node for ref_doc_id: {ref_doc_id_to_find}")
                # The node object itself contains the necessary metadata.
                return node 

        # If the loop completes and nothing is found
        print(f"Error: ref_doc_id {ref_doc_id_to_find} not found in any node in the docstore.")
        all_ref_ids = _armory_index.docstore.get_all_ref_doc_info()
        if all_ref_ids:
            print(f"Available ref_doc_ids: {list(all_ref_ids.keys())}")
        else:
            print("The docstore contains no ref_doc_ids.")
        return None

    except Exception as e:
        import traceback
        print(f"An unexpected error occurred while retrieving document {ref_doc_id_to_find} from Armory: {e}")
        traceback.print_exc()
        return None