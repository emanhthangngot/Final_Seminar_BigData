from pydantic import BaseModel, Field
from typing import Optional


class StressTestRequest(BaseModel):
    rounds: int = Field(default=3, ge=1, le=50)
    chunks_per_round: int = Field(default=20, ge=1, le=200)


class AccuracyBenchmarkRequest(BaseModel):
    corpus_size: int = Field(default=1000, ge=100, le=200_000)
    num_queries: int = Field(default=50, ge=10, le=2000)
    ingest: bool = True


class TradeoffRequest(BaseModel):
    ingest: bool = False


class HybridBenchmarkRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    top_k: int = Field(default=5, ge=1, le=50)


class AccuracyResult(BaseModel):
    Engine: str
    Recall_at_1: float = Field(alias="Recall@1")
    Recall_at_5: float = Field(alias="Recall@5")
    Recall_at_10: float = Field(alias="Recall@10")
    MRR: float
    AvgLatency_ms: float
    Errors: int = 0

    model_config = {"populate_by_name": True}


class TradeoffResult(BaseModel):
    Engine: str
    top_k: int
    Recall: float
    AvgLatency_ms: float
