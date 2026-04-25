from fastapi import APIRouter
from app.controllers.benchmark_controller import BenchmarkController
from app.models.benchmark import (
    AccuracyBenchmarkRequest, TradeoffRequest, StressTestRequest
)

router = APIRouter()


@router.post("/benchmark/accuracy")
def run_accuracy(req: AccuracyBenchmarkRequest):
    return BenchmarkController.accuracy(req)


@router.post("/benchmark/tradeoff")
def run_tradeoff(req: TradeoffRequest):
    return BenchmarkController.tradeoff(req)


@router.post("/benchmark/stress")
def run_stress(req: StressTestRequest):
    return BenchmarkController.stress(req)
