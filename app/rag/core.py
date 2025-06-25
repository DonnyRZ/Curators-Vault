# app/rag/core.py

import os
import re
from dotenv import load_dotenv

# LlamaIndex Core Imports
from llama_index.core import (
    VectorStoreIndex,
    Document,
    PromptTemplate
)
from llama_index.core.settings import Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Vector Store and FAISS imports
import faiss
from llama_index.vector_stores.faiss import FaissVectorStore


class RagEngine:
    """
    A self-contained engine for all RAG operations in the Curator's Atlas.
    """
    def __init__(self):
        """Initializes the RAG engine by loading configuration and setting up models."""
        print("Initializing RAG Engine...")
        load_dotenv()

        llm_model_name = os.getenv("LLM_MODEL")
        embed_model_name = os.getenv("EMBED_MODEL")

        if not all([llm_model_name, embed_model_name]):
            raise ValueError("LLM_MODEL and EMBED_MODEL must be set in the .env file.")

        llm = Ollama(model=llm_model_name, request_timeout=120.0)
        embed_model = HuggingFaceEmbedding(model_name=embed_model_name)

        Settings.llm = llm
        Settings.embed_model = embed_model
        
        self.index = None
        print("RAG Engine Initialized Successfully.")

    def _clean_llm_response(self, response_text: str) -> str:
        """
        Uses regex to strip out <think>...</think> blocks and other markers.
        """
        pattern = re.compile(r'<think>.*?</think>', re.DOTALL)
        cleaned_text = re.sub(pattern, '', response_text)
        
        marker = "...done thinking."
        if marker in cleaned_text:
            cleaned_text = cleaned_text.split(marker, 1)[1]
            
        return cleaned_text.strip()

    def build_index_from_text(self, text_content: str, post_id: str):
        """
        Creates a FAISS-powered vector index from a single string of text.
        """
        print(f"Building index for post_id: {post_id}...")
        
        document = Document(text=text_content, doc_id=post_id)
        faiss_index = faiss.IndexFlatL2(768)
        vector_store = FaissVectorStore(faiss_index=faiss_index)
        self.index = VectorStoreIndex.from_documents(
            [document], 
            vector_store=vector_store
        )
        print("Index built successfully.")


    def get_one_liner_summary(self) -> str | None:
        """
        Queries the loaded index to generate a "One-Liner" summary.
        """
        if not self.index:
            print("Error: Index has not been built. Cannot generate summary.")
            return None

        print("Querying for One-Liner Summary...")
        
        qa_prompt_str = (
            "You are a tech analyst who writes punchy, clear summaries. "
            "Your task is to create a single-sentence summary of the following document. "
            "Focus on what the tool IS and what makes it UNIQUE. "
            "Keep the summary under 25 words. "
            "Do not use filler words. Do not explain yourself. Just provide the sentence.\n\n"
            "DOCUMENT:\n"
            "----------\n"
            "{context_str}\n"
            "----------\n"
            "PUNCHY ONE-SENTENCE SUMMARY:"
        )
        qa_prompt_template = PromptTemplate(qa_prompt_str)

        query_engine = self.index.as_query_engine(
            response_mode="compact",
            text_qa_template=qa_prompt_template
        )
        
        response = query_engine.query("Summarize the document.")
        
        clean_summary = self._clean_llm_response(str(response))
        print(f"Generated Summary: {clean_summary}")
        return clean_summary

    # --- NEW METHOD ---
    def get_capability_tags(self, summary_text: str) -> str | None:
        """
        Analyzes a summary to extract key technical capability tags.
        """
        if not self.index:
            print("Error: Index has not been built. Cannot generate tags.")
            return None
        
        print("Querying for Capability Tags...")

        # --- NEW, STRICTER PROMPT FOR TAGGING ---
        tagging_prompt_str = (
            "You are a Senior Software Architect. Your task is to analyze the following summary "
            "and extract 3-5 key technical capabilities. "
            "Use short, 2-3 word phrases. "
            "Format the output as a single, comma-separated list. "
            "Do not add any preamble or explanation. Just provide the tags.\n\n"
            "EXAMPLES:\n"
            "- 'CLI Tool, API Integration, Data Visualization'\n"
            "- 'Web Framework, Database ORM, Authentication'\n"
            "- 'AI Model, Text Generation, Local Inference'\n\n"
            "SUMMARY TO ANALYZE:\n"
            "----------\n"
            "{query_str}\n"
            "----------\n"
            "CAPABILITY TAGS:"
        )
        tagging_prompt_template = PromptTemplate(tagging_prompt_str)

        # Create a new query engine specifically for this tagging task
        query_engine = self.index.as_query_engine(
            prompt_template_str=tagging_prompt_template.template
        )

        # We query with the summary text itself
        response = query_engine.query(summary_text)

        clean_tags = self._clean_llm_response(str(response))
        print(f"Generated Tags: {clean_tags}")
        return clean_tags