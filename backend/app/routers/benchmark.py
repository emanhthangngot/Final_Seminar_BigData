from fastapi import APIRouter
from app.controllers.benchmark_controller import BenchmarkController
from app.models.benchmark import (
    AccuracyBenchmarkRequest,
    BenchmarkReportResponse,
    FullBenchmarkRequest,
    HybridBenchmarkRequest,
    TradeoffRequest,
    StressTestRequest,
)

router = APIRouter()


@router.get("/benchmark/accuracy/latest")
def get_latest_accuracy():
    return BenchmarkController.latest_accuracy()


@router.get("/benchmark/tradeoff/latest")
def get_latest_tradeoff():
    return BenchmarkController.latest_tradeoff()


@router.get("/benchmark/setup")
def get_benchmark_setup():
    return BenchmarkController.setup()


@router.post("/benchmark/full")
def start_full_benchmark(req: FullBenchmarkRequest):
    return BenchmarkController.start_full(req)


@router.get("/benchmark/jobs/latest")
def get_latest_benchmark_job():
    return BenchmarkController.latest_job()


@router.get("/benchmark/jobs/{job_id}")
def get_benchmark_job(job_id: str):
    return BenchmarkController.job(job_id)


@router.get("/benchmark/report", response_model=BenchmarkReportResponse)
def get_benchmark_report():
    return BenchmarkController.report()


@router.post("/benchmark/accuracy")
def run_accuracy(req: AccuracyBenchmarkRequest):
    return BenchmarkController.accuracy(req)


@router.post("/benchmark/tradeoff")
def run_tradeoff(req: TradeoffRequest):
    return BenchmarkController.tradeoff(req)


@router.post("/benchmark/hybrid")
def run_hybrid(req: HybridBenchmarkRequest):
    return BenchmarkController.hybrid(req)


@router.post("/benchmark/stress")
def run_stress(req: StressTestRequest):
    return BenchmarkController.stress(req)
