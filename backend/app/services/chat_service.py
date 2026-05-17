import sys, pathlib, time
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from core.data_ingestion.embedder import Embedder
from core.data_ingestion.generator import LLMGenerator
from src.config import EMBEDDING_MODEL, LLM_MODEL, MOCK_MODE, TOP_K
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
        context_chunks = engine.search(query_vector, top_k=TOP_K)
        answer = self.generator.generate(query, context_chunks, db_name)
        latency = (time.perf_counter() - t0) * 1000

        return {
            "answer": answer,
            "db": db_name,
            "latency_ms": round(latency, 2),
            "context_chunks": context_chunks[:3],
            "model": LLM_MODEL,
            "embedding_model": EMBEDDING_MODEL,
            "mock_mode": MOCK_MODE,
        }

    def compare_chat(self, query: str, top_k: int = TOP_K) -> dict:
        engines = db_service.all()
        if not engines:
            raise ValueError("No databases are connected.")

        query_started = time.perf_counter()
        query_vector = self.embedder.embed_query(query)
        embedding_ms = (time.perf_counter() - query_started) * 1000

        results: dict[str, dict] = {}
        with ThreadPoolExecutor(max_workers=len(engines)) as executor:
            futures = {
                executor.submit(self._chat_one, db_name, engine, query, query_vector, top_k): db_name
                for db_name, engine in engines.items()
            }
            for future in as_completed(futures):
                db_name = futures[future]
                try:
                    results[db_name] = future.result()
                except Exception as exc:
                    results[db_name] = {
                        "status": "error",
                        "answer": "",
                        "context_chunks": [],
                        "retrieval_ms": 0,
                        "generation_ms": 0,
                        "total_ms": 0,
                        "result_count": 0,
                        "error": str(exc),
                    }

        return {
            "query": query,
            "embedding_ms": round(embedding_ms, 2),
            "model": LLM_MODEL,
            "embedding_model": EMBEDDING_MODEL,
            "mock_mode": MOCK_MODE,
            "results": results,
            "summary": self._build_summary(results),
        }

    def _chat_one(self, db_name: str, engine, query: str, query_vector: list[float], top_k: int) -> dict:
        total_started = time.perf_counter()

        retrieval_started = time.perf_counter()
        context_chunks = engine.search(query_vector, top_k=top_k)
        retrieval_ms = (time.perf_counter() - retrieval_started) * 1000

        generation_started = time.perf_counter()
        answer = self.generator.generate(query, context_chunks, db_name)
        generation_ms = (time.perf_counter() - generation_started) * 1000

        return {
            "status": "success",
            "answer": answer,
            "context_chunks": context_chunks[:3],
            "retrieval_ms": round(retrieval_ms, 2),
            "generation_ms": round(generation_ms, 2),
            "total_ms": round((time.perf_counter() - total_started) * 1000, 2),
            "result_count": len(context_chunks),
            "error": None,
        }

    @staticmethod
    def _build_summary(results: dict[str, dict]) -> dict:
        successful = {
            name: result
            for name, result in results.items()
            if result.get("status") == "success"
        }
        if not successful:
            return {
                "fastest_total": None,
                "fastest_retrieval": None,
                "highest_context_count": None,
                "success_count": 0,
                "error_count": len(results),
            }

        return {
            "fastest_total": min(successful, key=lambda name: successful[name]["total_ms"]),
            "fastest_retrieval": min(successful, key=lambda name: successful[name]["retrieval_ms"]),
            "highest_context_count": max(successful, key=lambda name: successful[name]["result_count"]),
            "success_count": len(successful),
            "error_count": len(results) - len(successful),
        }


chat_service = ChatService()
