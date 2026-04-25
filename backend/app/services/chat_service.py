import sys, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from core.data_ingestion.embedder import Embedder
from core.data_ingestion.generator import LLMGenerator
from .database_service import db_service


class ChatService:
    def __init__(self):
        self._embedder: Embedder | None = None
        self._generator: LLMGenerator | None = None

    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        return self._embedder

    @property
    def generator(self) -> LLMGenerator:
        if self._generator is None:
            self._generator = LLMGenerator()
        return self._generator

    def chat(self, query: str, db_name: str) -> dict:
        engine = db_service.get(db_name)
        if engine is None:
            raise ValueError(f"Database '{db_name}' is not connected.")

        t0 = time.perf_counter()
        query_vector = self.embedder.embed_query(query)
        context_chunks = engine.search(query_vector, top_k=5)
        answer = self.generator.generate(query, context_chunks, db_name)
        latency = (time.perf_counter() - t0) * 1000

        return {
            "answer": answer,
            "db": db_name,
            "latency_ms": round(latency, 2),
            "context_chunks": context_chunks[:3],
        }


chat_service = ChatService()
