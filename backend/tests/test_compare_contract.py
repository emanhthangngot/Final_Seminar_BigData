import asyncio
import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class FakeEngine:
    def __init__(self, name, fail_insert=False, fail_search=False):
        self.name = name
        self.fail_insert = fail_insert
        self.fail_search = fail_search
        self.insert_calls = 0

    def insert(self, chunks, embeddings):
        self.insert_calls += 1
        if self.fail_insert:
            raise RuntimeError(f"{self.name} insert failed")
        return True

    def search(self, query_vector, top_k=5):
        if self.fail_search:
            raise RuntimeError(f"{self.name} search failed")
        return [f"{self.name} chunk {idx}" for idx in range(top_k)]


class FakeEmbedder:
    def __init__(self):
        self.documents_calls = 0
        self.query_calls = 0

    def embed_documents(self, chunks):
        self.documents_calls += 1
        return [[0.1, 0.2, 0.3] for _ in chunks]

    def embed_query(self, query):
        self.query_calls += 1
        return [0.1, 0.2, 0.3]


class FakeGenerator:
    def generate(self, query, context_chunks, db_name=None):
        return f"{db_name} answer from {len(context_chunks)} chunks"


class CompareContractTests(unittest.TestCase):
    def test_ingest_pdf_all_embeds_once_and_reports_partial_errors(self):
        from app.services.ingest_service import IngestService

        service = IngestService()
        service._embedder = FakeEmbedder()
        engines = {
            "Qdrant": FakeEngine("Qdrant"),
            "Weaviate": FakeEngine("Weaviate", fail_insert=True),
            "Milvus": FakeEngine("Milvus"),
        }

        with (
            mock.patch("app.services.ingest_service.load_and_chunk_pdf", return_value=["a", "b"]),
            mock.patch("app.services.ingest_service.db_service.all", return_value=engines),
        ):
            result = asyncio.run(service.ingest_pdf_all(b"%PDF", "sample.pdf"))

        self.assertEqual(result["chunks"], 2)
        self.assertEqual(service.embedder.documents_calls, 1)
        self.assertEqual(result["results"]["Qdrant"]["status"], "success")
        self.assertEqual(result["results"]["Weaviate"]["status"], "error")
        self.assertEqual(result["results"]["Milvus"]["status"], "success")
        self.assertIn("insert failed", result["results"]["Weaviate"]["error"])

    def test_compare_chat_embeds_once_and_returns_per_database_metrics(self):
        from app.services.chat_service import ChatService

        service = ChatService()
        service._embedder = FakeEmbedder()
        service._generator = FakeGenerator()
        engines = {
            "Qdrant": FakeEngine("Qdrant"),
            "Weaviate": FakeEngine("Weaviate", fail_search=True),
            "Milvus": FakeEngine("Milvus"),
        }

        with mock.patch("app.services.chat_service.db_service.all", return_value=engines):
            result = service.compare_chat("compare this", top_k=2)

        self.assertEqual(result["query"], "compare this")
        self.assertEqual(service.embedder.query_calls, 1)
        self.assertEqual(result["results"]["Qdrant"]["status"], "success")
        self.assertEqual(result["results"]["Qdrant"]["result_count"], 2)
        self.assertGreaterEqual(result["results"]["Qdrant"]["retrieval_ms"], 0)
        self.assertGreaterEqual(result["results"]["Qdrant"]["generation_ms"], 0)
        self.assertGreaterEqual(result["results"]["Qdrant"]["total_ms"], 0)
        self.assertEqual(result["results"]["Weaviate"]["status"], "error")
        self.assertIn("search failed", result["results"]["Weaviate"]["error"])
        self.assertIn(result["summary"]["fastest_total"], {"Qdrant", "Milvus"})


if __name__ == "__main__":
    unittest.main()
