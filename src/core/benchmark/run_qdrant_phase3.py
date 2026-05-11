"""
Qdrant Phase 3 - All-in-One Benchmark Runner
Owner: Person D

Usage: python -m src.core.benchmark.run_qdrant_phase3
"""

from __future__ import annotations

import random
import time
from pathlib import Path

from src.core.db_clients.qdrant import QdrantWrapper
from src.core.data_ingestion.embedder import Embedder
from src.core.benchmark.evaluator import run_accuracy_benchmark
from src.core.benchmark.tradeoff import run_tradeoff_sweep
from src.core.benchmark.dataset import build_corpus
from src.core.benchmark.filter_benchmark_qdrant import run_filter_benchmark, print_filter_report
from src.core.benchmark.resource_monitor import get_container_stats
from src.core.utils.dx_analyzer import analyze_dx
from src.core.utils.logger import logger
from src.config import BENCH_CORPUS_SIZE, BENCH_NUM_QUERIES

CORPUS_SIZE = BENCH_CORPUS_SIZE
NUM_QUERIES = BENCH_NUM_QUERIES
K_VALUES = [1, 2, 5, 10, 20, 50]
FILTER_NUM_QUERIES = 20
RESULT_DIR = Path(__file__).resolve().parent


def _banner(step, total, title):
    print(f"\n{'=' * 70}")
    print(f"  STEP {step}/{total} - {title}")
    print(f"{'=' * 70}")


def _progress(current, total, message):
    pct = int(current / total * 100)
    bar = "#" * (pct // 5) + "." * (20 - pct // 5)
    print(f"  [{bar}] {pct:3d}% | {message}", end="\r", flush=True)


def main():
    t_global = time.perf_counter()
    TOTAL = 6

    print("+" + "=" * 62 + "+")
    print("|  QDRANT PHASE 3 - ALL-IN-ONE BENCHMARK                     |")
    print(f"|  Corpus: {CORPUS_SIZE:,} chunks | Queries: {NUM_QUERIES}          |")
    print("+" + "=" * 62 + "+")

    qdrant = QdrantWrapper()
    embedder = Embedder()
    engines = {"Qdrant": qdrant}

    # STEP 1
    _banner(1, TOTAL, "CONNECT & RESET COLLECTION")
    t0 = time.perf_counter()
    qdrant.connect()
    qdrant.reset_collection()
    print(f"  [OK] Collection reset ({(time.perf_counter() - t0)*1000:.0f} ms)")

    # STEP 2
    _banner(2, TOTAL, f"ACCURACY BENCHMARK ({CORPUS_SIZE:,} chunks, {NUM_QUERIES} queries)")
    t0 = time.perf_counter()
    df_recall = run_accuracy_benchmark(
        db_engines=engines, embedder=embedder,
        corpus_size=CORPUS_SIZE, num_queries=NUM_QUERIES,
        ingest=True, progress_callback=_progress,
    )
    print()
    print(f"\n  >> Done in {time.perf_counter() - t0:.1f}s")
    print(f"\n{df_recall.to_string(index=False)}")

    # STEP 3
    _banner(3, TOTAL, f"TRADEOFF SWEEP (K = {K_VALUES})")
    t0 = time.perf_counter()
    df_tradeoff = run_tradeoff_sweep(
        db_engines=engines, embedder=embedder,
        k_values=K_VALUES, corpus_size=CORPUS_SIZE,
        num_queries=NUM_QUERIES, ingest=False,
        progress_callback=_progress,
    )
    print()
    print(f"\n  >> Done in {time.perf_counter() - t0:.1f}s")
    print(f"\n{df_tradeoff.to_string(index=False)}")

    # STEP 4
    _banner(4, TOTAL, f"FILTER LATENCY BENCHMARK ({FILTER_NUM_QUERIES} queries x 4 scenarios)")
    t0 = time.perf_counter()

    qdrant.reset_collection()
    corpus, _ = build_corpus(size=CORPUS_SIZE)
    vectors = embedder.embed_documents(corpus)

    rng = random.Random(42)
    metadata = [
        {"category": rng.choice(["tech", "science", "business", "health"]),
         "page": rng.randint(1, 20)}
        for _ in range(len(corpus))
    ]
    qdrant.insert(corpus, vectors, metadata)
    logger.info("[Phase3] Re-ingested %d chunks with metadata.", len(corpus))

    df_filter = run_filter_benchmark(
        qdrant_wrapper=qdrant, embedder=embedder,
        num_queries=FILTER_NUM_QUERIES,
    )
    print(f"\n  >> Done in {time.perf_counter() - t0:.1f}s")
    print_filter_report(df_filter)

    # STEP 5
    _banner(5, TOTAL, "RAM SNAPSHOT (Docker Container)")
    stats = get_container_stats("Qdrant")
    if stats:
        print(f"  CPU:  {stats['cpu_percent']}%")
        print(f"  RAM:  {stats['mem_usage_mb']:.2f} MB / {stats['mem_limit_mb']:.2f} MB")
        print(f"  Time: {stats['timestamp']}")
    else:
        print("  [WARN] Cannot get Docker stats. Is container running?")

    # STEP 6
    _banner(6, TOTAL, "DEVELOPER EXPERIENCE (DX) ANALYSIS")
    dx_results = analyze_dx()
    print(f"\n  {'Engine':<12} {'SLOC':>6} {'Methods':>9} {'Cyclomatic':>12} {'Imports':>9} {'Score':>8}")
    print(f"  {'-'*58}")
    for engine, data in dx_results.items():
        print(
            f"  {engine:<12} {data['sloc']:>6} {data['methods']:>9} "
            f"{data['cyclomatic']:>12} {data['third_party_imports']:>9} "
            f"{data['complexity_score']:>8.1f}"
        )

    # DONE
    total_time = time.perf_counter() - t_global
    print(f"\n{'=' * 70}")
    print(f"  [OK] ALL DONE - Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"{'=' * 70}")
    print(f"\n  Output files:")
    print(f"     - {RESULT_DIR / 'recall.csv'}")
    print(f"     - {RESULT_DIR / 'tradeoff.csv'}")
    print(f"     - {RESULT_DIR / 'metrics.csv'}")
    print()


if __name__ == "__main__":
    main()
