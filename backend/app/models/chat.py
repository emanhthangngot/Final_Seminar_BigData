from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    db: str = "Qdrant"


class ChatResponse(BaseModel):
    answer: str
    db: str
    latency_ms: float
    context_chunks: list[str] = []
