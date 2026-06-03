from fastapi import HTTPException
from app.models.benchmark import (
    AccuracyBenchmarkRequest,
    FullBenchmarkRequest,
    HybridBenchmarkRequest,
    TradeoffRequest,
    StressTestRequest,
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
    def setup() -> dict:
        return benchmark_service.get_setup_summary()

    @staticmethod
    def start_full(req: FullBenchmarkRequest) -> dict:
        try:
            return benchmark_service.start_full_benchmark_job(req)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    def job(job_id: str) -> dict:
        job = benchmark_service.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail=f"Benchmark job '{job_id}' was not found.")
        return job

    @staticmethod
    def latest_job() -> dict:
        job = benchmark_service.get_latest_job()
        if job is None:
            raise HTTPException(status_code=404, detail="No benchmark job has been started.")
        return job

    @staticmethod
    def report() -> dict:
        try:
            return benchmark_service.generate_report()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

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
