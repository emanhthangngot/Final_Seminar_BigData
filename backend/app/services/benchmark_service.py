import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

import pandas as pd
from core.benchmark.evaluator import run_accuracy_benchmark
from core.benchmark.tradeoff import run_tradeoff_sweep
from core.benchmark.stress_test import run_stress_test
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
        df: pd.DataFrame = run_accuracy_benchmark(
            db_service.all(), self.embedder,
            corpus_size=corpus_size,
            num_queries=num_queries,
            ingest=ingest,
        )
        return df.to_dict(orient="records")

    def run_tradeoff(self, ingest: bool) -> list[dict]:
        df: pd.DataFrame = run_tradeoff_sweep(
            db_service.all(), self.embedder, ingest=ingest,
        )
        return df.to_dict(orient="records")

    def run_stress(self, rounds: int, chunks_per_round: int) -> dict:
        return run_stress_test(
            db_service.all(), self.embedder,
            num_rounds=rounds,
            chunks_per_round=chunks_per_round,
        )


benchmark_service = BenchmarkService()
