from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str
    db: str = "Qdrant"


class CompareChatRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class ChatResponse(BaseModel):
    answer: str
    db: str
    latency_ms: float
    context_chunks: list[str] = []
    model: str
    embedding_model: str
    mock_mode: bool


class CompareDBResult(BaseModel):
    status: str
    answer: str = ""
    context_chunks: list[str] = []
    retrieval_ms: float = 0
    generation_ms: float = 0
    total_ms: float = 0
    result_count: int = 0
    error: str | None = None


class CompareSummary(BaseModel):
    fastest_total: str | None = None
    fastest_retrieval: str | None = None
    highest_context_count: str | None = None
    success_count: int
    error_count: int


class CompareChatResponse(BaseModel):
    query: str
    embedding_ms: float
    model: str
    embedding_model: str
    mock_mode: bool
    results: dict[str, CompareDBResult]
    summary: CompareSummary
