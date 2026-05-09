"""
Weaviate Stage-3 benchmark runner.

Automates Week-3 tasks for the Weaviate specialist:
- Accuracy benchmark (smoke/final)
- Recall vs Latency tradeoff sweep
- Hybrid/filter alpha sweep
- Resource snapshots (Docker stats)

Outputs a JSON summary for report/slide usage.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict, List

from src.config import BENCH_CORPUS_SIZE, BENCH_NUM_QUERIES
from src.core.benchmark.dataset import build_corpus, build_golden_queries
from src.core.benchmark.evaluator import run_accuracy_benchmark
from src.core.benchmark.tradeoff import run_tradeoff_sweep
from src.core.benchmark.resource_monitor import get_container_stats
from src.core.data_ingestion.embedder import Embedder
from src.core.db_clients.weaviate import WeaviateWrapper
from src.core.utils.logger import logger

DEFAULT_OUTPUT = Path("docs") / "weaviate_stage3_results.json"
HYBRID_ALPHAS = (0.25, 0.5, 0.75)


def _build_metadata(ids: List[str]) -> List[Dict[str, Any]]:
    categories = ["tech", "news", "finance"]
    metadata = []
    for i, cid in enumerate(ids):
        metadata.append({
            "source": "synthetic",
            "chunk_id": cid,
            "category": categories[i % len(categories)],
            "page": i % 20,
        })
    return metadata


def _sample_resources(samples: int = 3, delay_s: float = 0.5) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for _ in range(samples):
        stat = get_container_stats("Weaviate")
        if stat:
            rows.append(stat)
        time.sleep(delay_s)
    return rows


def _run_hybrid_sweep(db: WeaviateWrapper, embedder: Embedder, corpus_size: int) -> List[Dict[str, Any]]:
    corpus, ids = build_corpus(size=corpus_size)
    metadata = _build_metadata(ids)
    vectors = embedder.embed_documents(corpus)
    db.insert(corpus, vectors, metadata=metadata)

    pairs = build_golden_queries(corpus, ids, num_queries=1)
    query_text = pairs[0].query if pairs else "vector database hybrid search"
    query_embedding = embedder.embed_query(query_text)

    cases = [
        ("dense_only", None),
        ("hybrid_no_filter", None),
        ("hybrid_category", {"category": "tech"}),
        ("hybrid_range", {"page": {"gte": 3, "lte": 10}}),
        ("hybrid_combined", {"category": "tech", "page": {"gte": 3}}),
    ]

    rows: List[Dict[str, Any]] = []
    for case_name, filters in cases:
        if case_name == "dense_only":
            started = time.perf_counter()
            results = db.search(query_embedding, top_k=5)
            rows.append({
                "case": case_name,
                "alpha": None,
                "result_count": len(results),
                "latency_ms": (time.perf_counter() - started) * 1000,
            })
            continue

        for alpha in HYBRID_ALPHAS:
            started = time.perf_counter()
            results = db.search_hybrid(
                query_text,
                query_embedding,
                filters=filters,
                top_k=5,
                alpha=alpha,
            )
            rows.append({
                "case": case_name,
                "alpha": alpha,
                "result_count": len(results),
                "latency_ms": (time.perf_counter() - started) * 1000,
            })
    return rows


def _run_scenario(
    db: WeaviateWrapper,
    embedder: Embedder,
    name: str,
    corpus_size: int,
    num_queries: int,
) -> Dict[str, Any]:
    logger.info("[Weaviate][%s] Reset collection", name)
    db.reset_collection()

    resources_before = _sample_resources()
    accuracy_df = run_accuracy_benchmark(
        {"Weaviate": db},
        embedder,
        corpus_size=corpus_size,
        num_queries=num_queries,
        ingest=True,
    )
    resources_after_ingest = _sample_resources()

    tradeoff_df = run_tradeoff_sweep(
        {"Weaviate": db},
        embedder,
        corpus_size=corpus_size,
        num_queries=num_queries,
        ingest=False,
    )
    resources_after_tradeoff = _sample_resources()

    return {
        "accuracy": accuracy_df.to_dict(orient="records"),
        "tradeoff": tradeoff_df.to_dict(orient="records"),
        "resources": {
            "before": resources_before,
            "after_ingest": resources_after_ingest,
            "after_tradeoff": resources_after_tradeoff,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Weaviate Stage-3 Benchmark Runner")
    parser.add_argument(
        "--mode",
        choices=["smoke", "final", "both"],
        default="smoke",
        help="Which benchmark scale to run",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Output JSON path",
    )
    parser.add_argument(
        "--skip-hybrid",
        action="store_true",
        help="Skip the hybrid/filter alpha sweep",
    )
    args = parser.parse_args()

    db = WeaviateWrapper()
    db.connect()
    embedder = Embedder()

    summary: Dict[str, Any] = {
        "meta": {
            "mode": args.mode,
            "bench_corpus_size": BENCH_CORPUS_SIZE,
            "bench_num_queries": BENCH_NUM_QUERIES,
            "hybrid_alphas": HYBRID_ALPHAS,
        },
        "scenarios": {},
        "hybrid": None,
    }

    scenarios = []
    if args.mode in ("smoke", "both"):
        scenarios.append(("smoke", 1000, 50))
    if args.mode in ("final", "both"):
        scenarios.append(("final", BENCH_CORPUS_SIZE, BENCH_NUM_QUERIES))

    for name, corpus_size, num_queries in scenarios:
        summary["scenarios"][name] = _run_scenario(db, embedder, name, corpus_size, num_queries)

    if not args.skip_hybrid:
        logger.info("[Weaviate] Running hybrid/filter sweep")
        db.reset_collection()
        summary["hybrid"] = {
            "resources_before": _sample_resources(),
            "results": _run_hybrid_sweep(db, embedder, corpus_size=1000),
            "resources_after": _sample_resources(),
        }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logger.info("[Weaviate] Stage-3 results written to %s", output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
