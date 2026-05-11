"""
Accuracy Evaluator — Recall@K, MRR, and end-to-end ingestion-then-query.

Replaces the earlier substring-matching demo with an identity-based ground
truth: every synthetic chunk carries a unique `[CID:...]` tag which the
evaluator extracts from retrieved chunks to test exact membership.

Metrics reported per engine
---------------------------
- Recall@1 / Recall@5 / Recall@10   — fraction of queries whose gold chunk
                                       appears in the top-K retrieved ids.
- MRR                               — mean reciprocal rank of the gold chunk.
- Avg query latency (ms)            — measured around the `search` call.
"""

from __future__ import annotations

import time
from typing import Dict, List

import pandas as pd

from src.core.benchmark.dataset import (
    GoldenPair,
    build_corpus,
    build_golden_queries,
    extract_chunk_id,
)
from src.core.utils.logger import logger


K_VALUES = (1, 5, 10)


def _evaluate_one(
    engine_name: str,
    db,
    embedder,
    pairs: List[GoldenPair],
) -> Dict:
    hits = {k: 0 for k in K_VALUES}
    reciprocal_ranks: List[float] = []
    latencies_ms: List[float] = []
    errors = 0

    top_k = max(K_VALUES)

    for pair in pairs:
        try:
            qvec = embedder.embed_query(pair.query)

            t0 = time.perf_counter()
            chunks = db.search(qvec, top_k=top_k)
            latencies_ms.append((time.perf_counter() - t0) * 1000)

            retrieved_ids = [extract_chunk_id(c) for c in chunks]

            # Reciprocal rank: 1/position of the gold id, or 0 if not found.
            rr = 0.0
            for rank, rid in enumerate(retrieved_ids, start=1):
                if rid == pair.chunk_id:
                    rr = 1.0 / rank
                    for k in K_VALUES:
                        if rank <= k:
                            hits[k] += 1
                    break
            reciprocal_ranks.append(rr)
        except Exception as exc:
            errors += 1
            logger.error("[Evaluator] %s query failed: %s", engine_name, exc)

    n = max(len(pairs) - errors, 1)
    return {
        "Engine": engine_name,
        "Recall@1": round(100.0 * hits[1] / n, 2),
        "Recall@5": round(100.0 * hits[5] / n, 2),
        "Recall@10": round(100.0 * hits[10] / n, 2),
        "MRR": round(sum(reciprocal_ranks) / n, 4),
        "AvgLatency_ms": round(sum(latencies_ms) / max(len(latencies_ms), 1), 2),
        "Errors": errors,
    }


def run_accuracy_benchmark(
    db_engines: Dict,
    embedder,
    corpus_size: int = None,
    num_queries: int = None,
    ingest: bool = True,
    progress_callback=None,
) -> pd.DataFrame:
    """
    Full academic accuracy benchmark.

    Parameters
    ----------
    db_engines : dict
        {engine_name: wrapper} of connected databases.
    embedder : Embedder
        Shared embedder — all engines get the same vectors for fairness.
    corpus_size : int
        Override the corpus size (defaults to BENCH_CORPUS_SIZE).
    num_queries : int
        Override the number of golden queries (defaults to BENCH_NUM_QUERIES).
    ingest : bool
        If True, ingest the corpus into every engine before querying. Set
        False when the data is already loaded (e.g. from a previous run).
    progress_callback : callable(current, total, message), optional
        Streamlit-friendly progress hook.

    Returns
    -------
    pd.DataFrame
        One row per engine with Recall@K / MRR / AvgLatency / Errors.
    """
    corpus, ids, metadata = build_corpus(size=corpus_size)
    pairs = build_golden_queries(corpus, ids, num_queries=num_queries)
    logger.info(
        "[Evaluator] corpus=%d chunks, queries=%d, engines=%s",
        len(corpus), len(pairs), list(db_engines.keys()),
    )

    total_steps = len(db_engines) * (2 if ingest else 1)
    step = 0
    results: List[Dict] = []

    for name, db in db_engines.items():
        if ingest:
            step += 1
            if progress_callback:
                progress_callback(step, total_steps, f"[{name}] Embedding & ingesting {len(corpus)} chunks")
            try:
                vectors = embedder.embed_documents(corpus)
                db.insert(corpus, vectors, metadata=metadata)
            except Exception as exc:
                logger.error("[Evaluator] Ingestion failed on %s: %s", name, exc)
                results.append({
                    "Engine": name, "Recall@1": 0, "Recall@5": 0, "Recall@10": 0,
                    "MRR": 0, "AvgLatency_ms": 0, "Errors": len(pairs),
                })
                continue

        step += 1
        if progress_callback:
            progress_callback(step, total_steps, f"[{name}] Running {len(pairs)} golden queries")
        results.append(_evaluate_one(name, db, embedder, pairs))

    df = pd.DataFrame(results)
    try:
        from src.config import RECALL_FILE
        df.to_csv(RECALL_FILE, index=False)
    except Exception:
        pass
    return df
