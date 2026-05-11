"""
Phase 3 Master Script - Milvus Benchmark Runner (Smoke Test Only)
Owner: Person C (Tran Huu Kim Thanh)

Chạy toàn bộ các benchmark cần thiết cho Stage 3:
  1. Smoke accuracy benchmark: corpus=1000, queries=50
  2. Tradeoff sweep: top_k = 1, 2, 5, 10, 20, 50
  3. Filter latency benchmark (5 scenarios)
  4. Resource usage snapshot từ Docker containers

Output files:
  - src/core/benchmark/recall.csv      (Recall@K, MRR, AvgLatency per engine)
  - src/core/benchmark/tradeoff.csv    (top_k sweep curve)
  - src/core/benchmark/metrics.csv     (profiled operations latency ledger)

Cách chạy:
  python -m src.core.benchmark.run_milvus_phase3
"""

from __future__ import annotations

import io
import sys
import time
import hashlib
from typing import List

# Force UTF-8 output on Windows to avoid UnicodeEncodeError with special chars
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np

from src.config import VECTOR_DIM, BENCH_SEED
from src.core.db_clients.milvus import MilvusWrapper
from src.core.benchmark.evaluator import run_accuracy_benchmark
from src.core.benchmark.tradeoff import run_tradeoff_sweep
from src.core.benchmark.filter_benchmark import run_filter_benchmark, print_filter_report
from src.core.benchmark.resource_monitor import get_all_stats
from src.core.utils.logger import logger


# ─── MockEmbedder ─────────────────────────────────────────────────────────────
# Dùng khi Ollama chưa sẵn sàng (MOCK_MODE=true trong .env).
# Embedding được sinh deterministically từ SHA-256 hash + seed → đảm bảo
# cùng text luôn cho cùng vector GIỮA CÁC LẦN CHẠY (reproducible benchmark).
class MockEmbedder:
    """Deterministic mock embedder — không cần Ollama.

    Uses hashlib.sha256 (not built-in hash()) to ensure vectors are
    identical across Python sessions regardless of PYTHONHASHSEED.
    """

    def __init__(self, seed: int = BENCH_SEED):
        self._seed = seed

    def _stable_seed(self, text: str) -> int:
        """Generate a stable, deterministic integer seed from text + self._seed."""
        payload = f"{self._seed}:{text}".encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()
        return int(digest[:8], 16)  # first 8 hex chars → 32-bit seed

    def embed_query(self, text: str) -> List[float]:
        rng = np.random.default_rng(self._stable_seed(text))
        v = rng.random(VECTOR_DIM).astype("float32")
        norm = np.linalg.norm(v)
        return (v / norm if norm > 0 else v).tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(t) for t in texts]
# ──────────────────────────────────────────────────────────────────────────────


def _progress(current: int, total: int, message: str) -> None:
    """Progress callback dùng cho evaluator + tradeoff sweep."""
    bar_len = 30
    filled = int(bar_len * current / max(total, 1))
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"\r  [{bar}] {current}/{total}  {message:<50}", end="", flush=True)
    if current == total:
        print()  # newline khi xong


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def run_phase3() -> None:
    """Chạy toàn bộ Phase 3 Milvus benchmark (Smoke Test)."""

    print("\n" + "=" * 60)
    print("   MILVUS PHASE 3 BENCHMARK - Person C (Tran Huu Kim Thanh)")
    print("   Mode: SMOKE TEST  |  corpus=1000, queries=50")
    print("=" * 60)

    # ── Khởi tạo Milvus + embedder ────────────────────────────────────────────
    _section("[INIT] Connecting to Milvus")
    milvus = MilvusWrapper()
    try:
        milvus.connect()
        logger.info("[Phase3] Milvus connected OK.")
        print("  [OK] Milvus connected.")
    except Exception as exc:
        print(f"  [ERROR] Cannot connect to Milvus: {exc}")
        print("     Make sure Docker is running: docker compose up")
        sys.exit(1)

    # Reset để đảm bảo clean state (không lẫn data run trước)
    print("  [..] Resetting collection (clean benchmark state)...")
    milvus.reset_collection()
    print("  [OK] Collection reset & recreated.")

    embedder = MockEmbedder()

    # ── 1. Accuracy Benchmark ─────────────────────────────────────────────────
    _section("[1/4] Accuracy Benchmark (Recall@K, MRR)")
    print("  corpus_size=1000, num_queries=50\n")

    t_start = time.perf_counter()
    recall_df = run_accuracy_benchmark(
        db_engines={"Milvus": milvus},
        embedder=embedder,
        corpus_size=1000,
        num_queries=50,
        ingest=True,
        progress_callback=_progress,
    )
    elapsed = time.perf_counter() - t_start

    print(f"\n  [OK] Done in {elapsed:.1f}s. Results:\n")
    print(recall_df.to_string(index=False))

    # Canh bao neu Recall@5 thap hon 80%
    recall5 = recall_df.loc[recall_df["Engine"] == "Milvus", "Recall@5"]
    if not recall5.empty and recall5.iloc[0] < 80.0:
        print(
            f"\n  [WARN] Recall@5 = {recall5.iloc[0]:.2f}% < 80% threshold."
        )
        print("     Check: metric_type in INDEX_PARAMS, collection.load(), no leftover data.")
    else:
        r5 = recall5.iloc[0] if not recall5.empty else "N/A"
        print(f"\n  [OK] Recall@5 = {r5}% - passes >=80% threshold.")

    print("  -> Saved to recall.csv")

    # ── 2. Tradeoff Sweep ─────────────────────────────────────────────────────
    _section("[2/4] Tradeoff Sweep (top_k = 1, 2, 5, 10, 20, 50)")
    print("  Data already ingested in step 1 (ingest=False)\n")

    t_start = time.perf_counter()
    tradeoff_df = run_tradeoff_sweep(
        db_engines={"Milvus": milvus},
        embedder=embedder,
        k_values=(1, 2, 5, 10, 20, 50),
        corpus_size=1000,
        num_queries=50,
        ingest=False,   # data đã insert ở bước 1
        progress_callback=_progress,
    )
    elapsed = time.perf_counter() - t_start

    print(f"\n  [OK] Done in {elapsed:.1f}s. Results:\n")
    print(tradeoff_df.to_string(index=False))
    print("\n  -> Saved to tradeoff.csv")

    # Detect điểm inflection: recall tăng nhưng latency tăng mạnh
    milvus_tradeoff = tradeoff_df[tradeoff_df["Engine"] == "Milvus"].reset_index(drop=True)
    if len(milvus_tradeoff) > 1:
        print("\n  Tradeoff analysis:")
        for i in range(1, len(milvus_tradeoff)):
            prev = milvus_tradeoff.iloc[i - 1]
            curr = milvus_tradeoff.iloc[i]
            delta_recall = curr["Recall"] - prev["Recall"]
            delta_latency = curr["AvgLatency_ms"] - prev["AvgLatency_ms"]
            if delta_latency > 0:
                flag = "[!] latency spike" if delta_latency > 50 else "[OK]"
                print(
                    f"    top_k {int(prev['top_k'])}->{int(curr['top_k'])}: "
                    f"recall +{delta_recall:.1f}%, latency +{delta_latency:.1f}ms {flag}"
                )

    # ── 3. Filter Latency Benchmark ───────────────────────────────────────────
    _section("[3/4] Filter Latency Benchmark (5 expr scenarios)")
    print("  dense_only | equality | range | combined | in_filter\n")

    t_start = time.perf_counter()
    filter_df = run_filter_benchmark(
        milvus_wrapper=milvus,
        embedder=embedder,
        num_queries=20,
        top_k=5,
    )
    elapsed = time.perf_counter() - t_start

    print(f"\n  [OK] Done in {elapsed:.1f}s.")
    print_filter_report(filter_df)
    print("  -> Appended to metrics.csv")

    # ── 4. Resource Usage Snapshot ────────────────────────────────────────────
    _section("[4/4] Resource Usage Snapshot (Docker containers)")

    resource_df = get_all_stats()
    if not resource_df.empty:
        print()
        print(
            resource_df[["engine", "cpu_percent", "mem_usage_mb", "mem_limit_mb"]]
            .to_string(index=False)
        )
        milvus_row = resource_df[resource_df["engine"] == "Milvus"]
        if not milvus_row.empty:
            ram = milvus_row.iloc[0]["mem_usage_mb"]
            limit = milvus_row.iloc[0]["mem_limit_mb"]
            print(f"\n  Milvus RAM: {ram:.0f} MB / {limit:.0f} MB limit")
        print()
    else:
        print(
            "\n  [WARN] Could not read Docker stats.\n"
            "     Common causes:\n"
            "     - Script running inside container (no docker.sock)\n"
            "     - Package 'docker' not installed: pip install docker\n"
            "     - Docker Desktop not started\n"
        )

    # ── Tổng kết ──────────────────────────────────────────────────────────────
    _section("PHASE 3 SUMMARY")
    print("  Output files:")
    print("    [*] recall.csv   - Recall@K, MRR, AvgLatency per engine")
    print("    [*] tradeoff.csv - top_k sweep (Recall vs Latency)")
    print("    [*] metrics.csv  - profiled operation latency ledger")
    print()
    print("  Next steps:")
    print("    1. Send to Person A: recall.csv + tradeoff.csv + metrics.csv")
    print("    2. Fill real numbers into docs/milvus_analysis.md")
    print("    3. Write 3-5 bullet summary for each dashboard tab")
    print()
    print("[DONE] Phase 3 Milvus benchmark complete!\n")


if __name__ == "__main__":
    run_phase3()
