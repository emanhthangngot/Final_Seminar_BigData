"""
Filter Latency Benchmark — Qdrant payload filter deep-dive.
Owner: Person D (Trần Lê Trung Trực)

Đo latency cho 4 loại filter theo checklist person_D.md Stage 3:
  - dense_only     : không filter (baseline)
  - equality       : {"category": "tech"}
  - range          : {"page": {"gte": 3, "lte": 10}}
  - combined       : {"category": "tech", "page": {"gte": 3}}

Kết quả được append vào metrics.csv (cột: Timestamp, Engine, Operation, Duration_ms)
để frontend hiển thị.
"""

from __future__ import annotations

import time
from typing import List

import numpy as np
import pandas as pd

from src.config import VECTOR_DIM, BENCH_SEED
from src.core.benchmark.profiler import log_metrics
from src.core.utils.logger import logger


# ── Các kịch bản filter cần đo ────────────────────────────────────────────────
FILTER_SCENARIOS = [
    {
        "name": "dense_only",
        "filters": None,
        "description": "Dense-only baseline — no payload filter",
    },
    {
        "name": "equality",
        "filters": {"category": "tech"},
        "description": "Equality filter: category == \"tech\"",
    },
    {
        "name": "range",
        "filters": {"page": {"gte": 3, "lte": 10}},
        "description": "Range filter: page >= 3 and page <= 10",
    },
    {
        "name": "combined",
        "filters": {"category": "tech", "page": {"gte": 3}},
        "description": "Combined filter: category == \"tech\" and page >= 3",
    },
]


def _generate_query_vectors(num_queries: int, seed: int = BENCH_SEED) -> List[List[float]]:
    """Sinh ngẫu nhiên các query vector chuẩn hoá (unit vectors)."""
    rng = np.random.default_rng(seed)
    vecs = rng.random((num_queries, VECTOR_DIM)).astype("float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return (vecs / norms).tolist()


def run_filter_benchmark(
    qdrant_wrapper,
    embedder,
    num_queries: int = 20,
    top_k: int = 5,
) -> pd.DataFrame:
    """
    Chạy filter latency benchmark cho tất cả FILTER_SCENARIOS trên Qdrant.
    """
    logger.info(
        "[FilterBench] Starting Qdrant filter latency benchmark — %d queries × %d scenarios",
        num_queries, len(FILTER_SCENARIOS),
    )

    query_vectors = _generate_query_vectors(num_queries)
    rows = []

    # ── Warmup: chạy 5 query "hâm nóng" để nạp HNSW vào CPU cache ──
    logger.info("[FilterBench] Warming up Qdrant with 5 dummy queries...")
    warmup_vectors = _generate_query_vectors(5, seed=BENCH_SEED + 999)
    for wv in warmup_vectors:
        try:
            qdrant_wrapper.search(query_embedding=wv, top_k=top_k)
        except Exception:
            pass
    logger.info("[FilterBench] Warmup complete. Starting measurement.")

    for scenario in FILTER_SCENARIOS:
        name = scenario["name"]
        filters = scenario["filters"]
        desc = scenario["description"]

        latencies_ms: List[float] = []
        errors = 0

        logger.info("[FilterBench] Running scenario: %s — %s", name, desc)

        for i, qvec in enumerate(query_vectors):
            try:
                t0 = time.perf_counter()
                if filters:
                    qdrant_wrapper.search_hybrid(
                        query_text="benchmark filter query",
                        query_embedding=qvec,
                        filters=filters,
                        top_k=top_k,
                    )
                else:
                    qdrant_wrapper.search(
                        query_embedding=qvec,
                        top_k=top_k,
                    )
                elapsed_ms = (time.perf_counter() - t0) * 1000
                latencies_ms.append(elapsed_ms)
            except Exception as exc:
                errors += 1
                logger.warning(
                    "[FilterBench] Scenario '%s' query #%d failed: %s", name, i, exc
                )

        if latencies_ms:
            avg_ms = round(sum(latencies_ms) / len(latencies_ms), 2)
            min_ms = round(min(latencies_ms), 2)
            max_ms = round(max(latencies_ms), 2)
        else:
            avg_ms = min_ms = max_ms = 0.0

        # Ghi vào metrics.csv qua profiler.log_metrics (thread-safe)
        operation_key = f"search_{name}" if not filters else f"search_hybrid_{name}"
        log_metrics("Qdrant", operation_key, avg_ms)

        rows.append(
            {
                "Engine": "Qdrant",
                "FilterType": name,
                "Filter": str(filters),
                "AvgLatency_ms": avg_ms,
                "MinLatency_ms": min_ms,
                "MaxLatency_ms": max_ms,
                "Errors": errors,
            }
        )

        logger.info(
            "[FilterBench] %s -> avg=%.2f ms, min=%.2f ms, max=%.2f ms, errors=%d",
            name, avg_ms, min_ms, max_ms, errors,
        )

    df = pd.DataFrame(rows)
    logger.info("[FilterBench] Filter benchmark complete. %d scenarios.", len(df))
    return df


def print_filter_report(df: pd.DataFrame) -> None:
    """In bảng kết quả filter benchmark ra console theo dạng dễ đọc."""
    print("\n" + "=" * 65)
    print("  QDRANT FILTER LATENCY BENCHMARK RESULTS")
    print("=" * 65)
    print(f"  {'FilterType':<20} {'AvgLatency_ms':>14} {'MinLatency_ms':>14} {'MaxLatency_ms':>14}")
    print("-" * 65)
    for _, row in df.iterrows():
        print(
            f"  {row['FilterType']:<20} {row['AvgLatency_ms']:>14.2f}"
            f" {row['MinLatency_ms']:>14.2f} {row['MaxLatency_ms']:>14.2f}"
        )
    print("=" * 65)

    # Phân tích overhead so với baseline
    baseline = df.loc[df["FilterType"] == "dense_only", "AvgLatency_ms"]
    if not baseline.empty:
        baseline_ms = baseline.iloc[0]
        print(f"\n  Overhead vs dense_only baseline ({baseline_ms:.2f} ms):")
        for _, row in df.iterrows():
            if row["FilterType"] == "dense_only":
                continue
            overhead = row["AvgLatency_ms"] - baseline_ms
            sign = "+" if overhead >= 0 else ""
            print(f"    {row['FilterType']:<20} {sign}{overhead:.2f} ms")
    print()


if __name__ == "__main__":
    from src.core.db_clients.qdrant import QdrantWrapper
    from src.core.data_ingestion.embedder import Embedder
    
    q = QdrantWrapper()
    q.connect()
    
    df_result = run_filter_benchmark(q, Embedder(), num_queries=20)
    print_filter_report(df_result)
