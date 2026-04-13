"""
Recall vs Latency tradeoff sweep.

Produces the classic ann-benchmarks.com style curve: for each engine, we
query the golden set multiple times at different `top_k` values and record
(Recall@K, AvgLatency_ms). Plotting this curve shows where each DB lives on
the accuracy-speed Pareto frontier — a much more honest comparison than a
single bar chart.

For a deeper sweep, B / C / D can extend this module to also sweep engine
specific knobs (ef_search for HNSW, nprobe for IVF, etc.) from their wrapper.
"""

from __future__ import annotations

import time
from typing import Dict, Iterable, List

import pandas as pd

from src.core.benchmark.dataset import (
    build_corpus,
    build_golden_queries,
    extract_chunk_id,
)
from src.core.utils.logger import logger
from src.config import TRADEOFF_FILE


def run_tradeoff_sweep(
    db_engines: Dict,
    embedder,
    k_values: Iterable[int] = (1, 2, 5, 10, 20, 50),
    corpus_size: int | None = None,
    num_queries: int | None = None,
    ingest: bool = False,
    progress_callback=None,
) -> pd.DataFrame:
    """
    Sweep `top_k` across `k_values` for every engine and record recall +
    average latency. Returns a long-format DataFrame ready to feed into a
    Plotly line chart (`x=AvgLatency_ms, y=Recall, color=Engine`).
    """
    corpus, ids = build_corpus(size=corpus_size)
    pairs = build_golden_queries(corpus, ids, num_queries=num_queries)
    k_values = list(k_values)

    if ingest:
        for name, db in db_engines.items():
            logger.info("[Tradeoff] Ingesting %d chunks into %s", len(corpus), name)
            try:
                vectors = embedder.embed_documents(corpus)
                db.insert(corpus, vectors)
            except Exception as exc:
                logger.error("[Tradeoff] Ingestion failed on %s: %s", name, exc)

    total_steps = len(db_engines) * len(k_values)
    step = 0
    rows: List[Dict] = []

    for name, db in db_engines.items():
        for k in k_values:
            step += 1
            if progress_callback:
                progress_callback(step, total_steps, f"[{name}] sweeping top_k={k}")

            hits = 0
            latencies_ms: List[float] = []
            for pair in pairs:
                try:
                    qvec = embedder.embed_query(pair.query)
                    t0 = time.perf_counter()
                    chunks = db.search(qvec, top_k=k)
                    latencies_ms.append((time.perf_counter() - t0) * 1000)
                    retrieved_ids = [extract_chunk_id(c) for c in chunks]
                    if pair.chunk_id in retrieved_ids:
                        hits += 1
                except Exception as exc:
                    logger.error("[Tradeoff] %s k=%d failed: %s", name, k, exc)

            n = max(len(pairs), 1)
            rows.append({
                "Engine": name,
                "top_k": k,
                "Recall": round(100.0 * hits / n, 2),
                "AvgLatency_ms": round(sum(latencies_ms) / max(len(latencies_ms), 1), 2),
            })

    df = pd.DataFrame(rows)
    try:
        df.to_csv(TRADEOFF_FILE, index=False)
    except Exception:
        pass
    return df
