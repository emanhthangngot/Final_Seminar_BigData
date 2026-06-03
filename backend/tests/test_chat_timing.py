import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class FakeEmbedder:
    def embed_query(self, query):
        return [0.1, 0.2, 0.3]


class FakeGenerator:
    def generate(self, query, context_chunks, db_name):
        return f"{db_name}: {query}"


class FakeEngine:
    def __init__(self):
        self.top_k = None

    def search(self, query_vector, top_k=5):
        self.top_k = top_k
        return ["chunk 1", "chunk 2", "chunk 3", "chunk 4"]


class ChatTimingTests(unittest.TestCase):
    def test_chat_returns_stage_timing_and_respects_top_k(self):
        from app.services.chat_service import ChatService

        service = ChatService()
        service._embedder = FakeEmbedder()
        service._generator = FakeGenerator()
        engine = FakeEngine()

        with mock.patch("app.services.chat_service.db_service.get", return_value=engine):
            result = service.chat("metadata filter", "Qdrant", top_k=3)

        self.assertEqual(engine.top_k, 3)
        self.assertEqual(result["db"], "Qdrant")
        self.assertEqual(result["result_count"], 4)
        self.assertEqual(len(result["context_chunks"]), 3)
        self.assertIn("embedding_ms", result)
        self.assertIn("retrieval_ms", result)
        self.assertIn("generation_ms", result)
        self.assertEqual(result["latency_ms"], result["total_ms"])


if __name__ == "__main__":
    unittest.main()
