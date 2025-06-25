# test_rag.py

import time
from app.rag.core import RagEngine

# This is a sample README from a hypothetical project
# We'll use this as our test document
DUMMY_README_TEXT = """
# Project Chrono-Weaver

Chrono-Weaver is a lightweight, high-performance Python library for intelligently managing and scheduling asynchronous tasks based on predicted execution time. Unlike traditional cron jobs or simple task queues that fire at fixed intervals, Chrono-Weaver uses a machine learning model to estimate how long a function will take to run and dynamically adjusts the schedule to optimize system load and ensure high-priority tasks are executed first.

## Core Features
- **Predictive Scheduling:** Analyzes a task's history and complexity to predict its runtime.
- **Dynamic Prioritization:** Automatically reorders the task queue based on user-defined priorities and predicted completion times.
- **Low Footprint:** Designed to run with minimal CPU and memory overhead, making it suitable for resource-constrained environments.

This tool is ideal for data processing pipelines, periodic report generation, or any system where task execution times are variable and unpredictable.
"""

if __name__ == "__main__":
    print("--- RAG Engine Sanity Check ---")
    
    # 1. Initialize the Engine
    start_time = time.time()
    try:
        engine = RagEngine()
    except Exception as e:
        print(f"\n[ERROR] Failed to initialize RagEngine: {e}")
        exit()
    init_duration = time.time() - start_time
    print(f"Initialization took: {init_duration:.2f} seconds")
    print("-" * 30)

    # 2. Build the Index from our sample text
    start_time = time.time()
    try:
        engine.build_index_from_text(DUMMY_README_TEXT, post_id="test-post-123")
    except Exception as e:
        print(f"\n[ERROR] Failed to build index: {e}")
        exit()
    build_duration = time.time() - start_time
    print(f"Index building took: {build_duration:.2f} seconds")
    print("-" * 30)

    # 3. Get the "One-Liner" Summary
    start_time = time.time()
    try:
        summary = engine.get_one_liner_summary()
    except Exception as e:
        print(f"\n[ERROR] Failed to get summary: {e}")
        exit()
    query_duration = time.time() - start_time
    print(f"Summary query took: {query_duration:.2f} seconds")
    print("-" * 30)

    print("\n--- TEST COMPLETE ---")
    if summary:
        print(f"\nSUCCESS! The RAG Engine generated the following summary:")
        print(f'>>> "{summary}"')
    else:
        print("\nFAILURE! The RAG Engine did not return a summary.")