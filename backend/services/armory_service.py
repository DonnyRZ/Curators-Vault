import os
import json
from llama_index.core import Document, VectorStoreIndex, StorageContext, load_index_from_storage
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.core import Settings

from config import ARMORY_PATH, ARMORY_INDEX_PATH, EMBED_MODEL, LLM_MODEL

# Configure LlamaIndex global settings
Settings.embed_model = HuggingFaceEmbedding(model_name=EMBED_MODEL)
Settings.llm = Ollama(model=LLM_MODEL, request_timeout=300.0)
Settings.node_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=20)

def build_armory_index():
    """
    Builds a vector store index from the JSON files in the Armory.
    """
    print("Building Armory index...")
    if not os.path.exists(ARMORY_PATH):
        print("Armory path does not exist. Skipping index build.")
        return

    documents = []
    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Create a Document object for each tool
                    doc_text = f"Repo: {data.get('repo_name', '')}\nUse Case: {data.get('primary_use_case', '')}\nOne Liner: {data.get('one_liner', '')}\nTags: {', '.join(data.get('capability_tags', []))}"
                    document = Document(
                        text=doc_text,
                        metadata={
                            "url": data.get('url'),
                            "repo_name": data.get('repo_name')
                        }
                    )
                    documents.append(document)
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")

    if not documents:
        print("No documents found to index.")
        return

    # Create and persist the index
    index = VectorStoreIndex.from_documents(documents)
    index.storage_context.persist(persist_dir=ARMORY_INDEX_PATH)
    print(f"Armory index built and saved to: {ARMORY_INDEX_PATH}")

def delete_repo(repo_url: str) -> str:
    """
    Deletes a repository's JSON file from the Armory, rebuilds the index,
    and returns the URL of the deleted repository.
    """
    print(f"Attempting to delete repository: {repo_url}")
    deleted = False
    for filename in os.listdir(ARMORY_PATH):
        if filename.endswith(".json"):
            filepath = os.path.join(ARMORY_PATH, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get('url') == repo_url:
                        os.remove(filepath)
                        print(f"Deleted {filepath}")
                        deleted = True
                        break
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")

    if not deleted:
        raise FileNotFoundError(f"Repository with URL {repo_url} not found in Armory.")

    # Rebuild the armory index after deletion
    build_armory_index()
    print(f"Repository {repo_url} deleted and Armory index rebuilt.")
    return repo_url

def query_armory_index(query_text: str, top_k: int = 5) -> list[dict]:
    """
    Queries the Armory index to find the most relevant tools.
    """
    if not os.path.exists(ARMORY_INDEX_PATH):
        print("Armory index not found. Building it first.")
        build_armory_index()

    try:
        storage_context = StorageContext.from_defaults(persist_dir=ARMORY_INDEX_PATH)
        index = load_index_from_storage(storage_context)
        query_engine = index.as_query_engine(similarity_top_k=top_k)
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
