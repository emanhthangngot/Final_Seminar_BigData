import sys, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

import pandas as pd
from config import BENCHMARK_DIR, FRONTEND_BENCHMARK_DATA_DIR
from core.data_ingestion.embedder import Embedder
from .database_service import db_service


class BenchmarkService:
    def __init__(self):
        self._embedder = None

    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        return self._embedder

    def run_accuracy(self, corpus_size: int, num_queries: int, ingest: bool) -> list[dict]:
        from core.benchmark.milvus.evaluator import run_accuracy_benchmark

        df: pd.DataFrame = run_accuracy_benchmark(
            db_service.all(), self.embedder,
            corpus_size=corpus_size,
            num_queries=num_queries,
            ingest=ingest,
        )
        return df.to_dict(orient="records")

    def run_tradeoff(self, ingest: bool) -> list[dict]:
        from core.benchmark.milvus.tradeoff import run_tradeoff_sweep

        df: pd.DataFrame = run_tradeoff_sweep(
            db_service.all(), self.embedder, ingest=ingest,
        )
        return df.to_dict(orient="records")

    def run_hybrid(
        self,
        query: str,
        filters: dict | None,
        top_k: int,
        alpha: float | None,
    ) -> list[dict]:
        query_embedding = self.embedder.embed_query(query)
        rows: list[dict] = []
        for name, db in db_service.all().items():
            started = time.perf_counter()
            try:
                results = db.search_hybrid(
                    query, query_embedding, filters=filters, top_k=top_k, alpha=alpha
                )
                rows.append({
                    "Engine": name,
                    "Latency_ms": (time.perf_counter() - started) * 1000,
                    "ResultCount": len(results),
                    "Errors": 0,
                })
            except Exception as exc:
                rows.append({
                    "Engine": name,
                    "Latency_ms": 0,
                    "ResultCount": 0,
                    "Errors": 1,
                    "Error": str(exc),
                })
        return rows

    def run_stress(self, rounds: int, chunks_per_round: int) -> dict:
        from core.benchmark.milvus.stress_test import run_stress_test

        return run_stress_test(
            db_service.all(), self.embedder,
            num_rounds=rounds,
            chunks_per_round=chunks_per_round,
        )

    def get_latest_accuracy(self) -> list[dict]:
        return self._read_snapshot_csv("recall.csv", recall_columns=("Recall@1", "Recall@5", "Recall@10"))

    def get_latest_tradeoff(self) -> list[dict]:
        return self._read_snapshot_csv("tradeoff.csv", recall_columns=("Recall",))

    def _read_snapshot_csv(self, filename: str, recall_columns: tuple[str, ...]) -> list[dict]:
        if filename in {"recall.csv", "tradeoff.csv"}:
            df = self._read_per_database_snapshot(filename)
            if df.empty:
                path = self._find_snapshot_csv(filename)
                if path is None:
                    return []
                df = pd.read_csv(path)
        else:
            path = self._find_snapshot_csv(filename)
            if path is None:
                return []
            df = pd.read_csv(path)

        for column in recall_columns:
            if column in df.columns and df[column].max() > 1:
                df[column] = df[column] / 100.0
        return df.to_dict(orient="records")

    def _find_snapshot_csv(self, filename: str):
        candidates = [
            FRONTEND_BENCHMARK_DATA_DIR / "combined" / filename,
            BENCHMARK_DIR / filename,
            BENCHMARK_DIR / "weaviate" / filename,
        ]
        return next((path for path in candidates if path.exists()), None)

    def _read_per_database_snapshot(self, filename: str) -> pd.DataFrame:
        frames = []
        for db in ("milvus", "qdrant", "weaviate"):
            path = BENCHMARK_DIR / db / filename
            if path.exists():
                frames.append(pd.read_csv(path))
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

benchmark_service = BenchmarkService()
