from fastapi import HTTPException
from app.models.benchmark import (
    AccuracyBenchmarkRequest, HybridBenchmarkRequest, TradeoffRequest, StressTestRequest
)
from app.services.benchmark_service import benchmark_service


class BenchmarkController:
    @staticmethod
    def latest_accuracy() -> list[dict]:
        return benchmark_service.get_latest_accuracy()

    @staticmethod
    def latest_tradeoff() -> list[dict]:
        return benchmark_service.get_latest_tradeoff()

    @staticmethod
    def accuracy(req: AccuracyBenchmarkRequest) -> list[dict]:
        try:
            return benchmark_service.run_accuracy(req.corpus_size, req.num_queries, req.ingest)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    def tradeoff(req: TradeoffRequest) -> list[dict]:
        try:
            return benchmark_service.run_tradeoff(req.ingest)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    def hybrid(req: HybridBenchmarkRequest) -> list[dict]:
        try:
            return benchmark_service.run_hybrid(req.query, req.filters, req.top_k, req.alpha)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    def stress(req: StressTestRequest) -> dict:
        try:
            return benchmark_service.run_stress(req.rounds, req.chunks_per_round)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))
