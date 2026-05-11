"""
Stress Test Runner -- automated benchmarking across all Vector Databases.

Generates synthetic text data, embeds it, then performs N rounds of insert
and search operations on each connected database.  All timings are captured
automatically by the @time_profiler decorator and persisted to metrics.csv.

Usage from Streamlit UI (via sidebar button) or CLI:
    python -m src.core.benchmark.stress_test
"""

import time
import random
import string
from typing import List, Dict
from src.core.utils.logger import logger
from src.config import VECTOR_DIM


def _generate_sample_chunks(num_chunks: int = 20, avg_length: int = 800) -> List[str]:
    """Generate deterministic pseudo-random text chunks for benchmarking."""
    random.seed(42)
    chunks = []
    topics = [
        "Vector databases use approximate nearest neighbor algorithms for fast retrieval.",
        "HNSW is a hierarchical navigable small world graph used in similarity search.",
        "Cosine similarity measures the angle between two vectors in high-dimensional space.",
        "Milvus supports GPU-accelerated indexing for billion-scale vector datasets.",
        "Qdrant is written in Rust which provides zero-cost abstractions and memory safety.",
        "Weaviate offers a modular architecture with pluggable vectorizer modules.",
        "Binary quantization reduces memory footprint by up to 40x with minimal recall loss.",
        "The RAG pipeline combines retrieval from vector stores with LLM generation.",
        "Embedding models convert text into dense vector representations for semantic search.",
        "Distributed architectures enable horizontal scaling for enterprise workloads.",
    ]
    for i in range(num_chunks):
        base = topics[i % len(topics)]
        padding = " ".join(
            "".join(random.choices(string.ascii_lowercase, k=random.randint(3, 10)))
            for _ in range(avg_length // 8)
        )
        chunks.append(f"[Chunk {i+1}] {base} {padding}")
    return chunks


def run_stress_test(
    db_engines: Dict,
    embedder,
    num_rounds: int = 5,
    chunks_per_round: int = 20,
    progress_callback=None,
) -> Dict[str, Dict]:
    """
    Execute a multi-round stress test against all connected databases.

    Parameters
    ----------
    db_engines : dict
        Mapping of engine name to initialized DB wrapper instance.
    embedder : Embedder
        The embedding module (mock or live).
    num_rounds : int
        Number of insert+search cycles per database.
    chunks_per_round : int
        Number of text chunks generated per round.
    progress_callback : callable, optional
        Function(current_step, total_steps, message) for UI progress updates.

    Returns
    -------
    dict
        Summary statistics per engine: total_inserts, total_searches,
        avg_insert_ms, avg_search_ms.
    """
    total_steps = len(db_engines) * num_rounds * 2  # insert + search per round
    current_step = 0
    summary = {}

    for engine_name, db in db_engines.items():
        logger.info("[StressTest] Starting %d rounds on %s", num_rounds, engine_name)
        insert_times = []
        search_times = []

        for r in range(num_rounds):
            # Generate data
            chunks = _generate_sample_chunks(chunks_per_round)
            embeddings = embedder.embed_documents(chunks)

            # Insert
            current_step += 1
            if progress_callback:
                progress_callback(
                    current_step, total_steps,
                    f"[{engine_name}] Round {r+1}/{num_rounds} -- Inserting {chunks_per_round} chunks"
                )
            t0 = time.perf_counter()
            try:
                db.insert(chunks, embeddings)
            except Exception as exc:
                logger.error("[StressTest] Insert failed on %s round %d: %s", engine_name, r+1, exc)
            insert_times.append((time.perf_counter() - t0) * 1000)

            # Search
            current_step += 1
            if progress_callback:
                progress_callback(
                    current_step, total_steps,
                    f"[{engine_name}] Round {r+1}/{num_rounds} -- Searching top-5"
                )
            query_vector = embedder.embed_query(f"test query round {r}")
            t0 = time.perf_counter()
            try:
                db.search(query_vector, top_k=5)
            except Exception as exc:
                logger.error("[StressTest] Search failed on %s round %d: %s", engine_name, r+1, exc)
            search_times.append((time.perf_counter() - t0) * 1000)

        summary[engine_name] = {
            "total_inserts": num_rounds * chunks_per_round,
            "total_searches": num_rounds,
            "avg_insert_ms": round(sum(insert_times) / len(insert_times), 2) if insert_times else 0,
            "avg_search_ms": round(sum(search_times) / len(search_times), 2) if search_times else 0,
        }
        logger.info(
            "[StressTest] %s complete: avg insert=%.2fms, avg search=%.2fms",
            engine_name,
            summary[engine_name]["avg_insert_ms"],
            summary[engine_name]["avg_search_ms"],
        )

    return summary


if __name__ == "__main__":
    # CLI mode
    from src.core.data_ingestion.embedder import Embedder
    from src.core.db_clients.qdrant import QdrantWrapper
    from src.core.db_clients.weaviate import WeaviateWrapper
    from src.core.db_clients.milvus import MilvusWrapper

    engines = {}
    for name, cls in [("Qdrant", QdrantWrapper), ("Weaviate", WeaviateWrapper), ("Milvus", MilvusWrapper)]:
        try:
            w = cls()
            w.connect()
            engines[name] = w
        except Exception as e:
            print(f"Skipping {name}: {e}")

    if engines:
        emb = Embedder()
        results = run_stress_test(engines, emb, num_rounds=5)
        for eng, stats in results.items():
            print(f"\n--- {eng} ---")
            for k, v in stats.items():
                print(f"  {k}: {v}")
