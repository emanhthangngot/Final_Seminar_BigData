import tempfile
import unittest
from pathlib import Path

import src.config as config
import src.core.benchmark.milvus.tradeoff as tradeoff_module
from src.core.benchmark.milvus.dataset import build_corpus, build_golden_queries
from src.core.benchmark.milvus.evaluator import run_accuracy_benchmark


def _query_to_chunk_id(corpus_size, num_queries):
    corpus, ids, _metadata = build_corpus(size=corpus_size)
    pairs = build_golden_queries(corpus, ids, num_queries=num_queries)
    return {pair.query: pair.chunk_id for pair in pairs}


class CountingEmbedder:
    def __init__(self, query_to_chunk_id):
        self.query_to_chunk_id = query_to_chunk_id
        self.document_calls = []
        self.query_calls = []

    def embed_documents(self, texts):
        self.document_calls.append(list(texts))
        return [[float(self.query_to_chunk_id[text].removeprefix("CID_")), 0.0, 0.0] for text in texts]

    def embed_query(self, text):
        self.query_calls.append(text)
        raise AssertionError("benchmark should reuse pre-embedded query vectors")


class LookupDb:
    def __init__(self):
        self.insert_calls = 0
        self.search_vectors = []

    def insert(self, corpus, vectors, metadata=None):
        self.insert_calls += 1

    def search(self, qvec, top_k):
        self.search_vectors.append(qvec)
        idx = int(qvec[0])
        return [f"[CID_{idx:07d}] matching chunk"]


class BenchmarkPreembeddingTest(unittest.TestCase):
    def test_accuracy_benchmark_preembeds_queries_once_for_all_engines(self):
        embedder = CountingEmbedder(_query_to_chunk_id(corpus_size=5, num_queries=3))
        dbs = {"Qdrant": LookupDb(), "Weaviate": LookupDb(), "Milvus": LookupDb()}

        with tempfile.TemporaryDirectory() as tmpdir:
            old_recall_file = config.RECALL_FILE
            config.RECALL_FILE = Path(tmpdir) / "recall.csv"
            try:
                df = run_accuracy_benchmark(
                    dbs,
                    embedder,
                    corpus_size=5,
                    num_queries=3,
                    ingest=False,
                )
            finally:
                config.RECALL_FILE = old_recall_file

        self.assertEqual(embedder.query_calls, [])
        self.assertEqual(len(embedder.document_calls), 1)
        self.assertEqual(len(embedder.document_calls[0]), 3)
        self.assertTrue(all(len(db.search_vectors) == 3 for db in dbs.values()))
        self.assertEqual(df["Recall@1"].tolist(), [100.0, 100.0, 100.0])
        self.assertEqual(df["MRR"].tolist(), [1.0, 1.0, 1.0])

    def test_tradeoff_sweep_preembeds_queries_once_across_engines_and_k_values(self):
        embedder = CountingEmbedder(_query_to_chunk_id(corpus_size=5, num_queries=3))
        dbs = {"Qdrant": LookupDb(), "Weaviate": LookupDb(), "Milvus": LookupDb()}

        with tempfile.TemporaryDirectory() as tmpdir:
            old_tradeoff_file = tradeoff_module.TRADEOFF_FILE
            tradeoff_module.TRADEOFF_FILE = Path(tmpdir) / "tradeoff.csv"
            try:
                df = tradeoff_module.run_tradeoff_sweep(
                    dbs,
                    embedder,
                    k_values=(1, 5),
                    corpus_size=5,
                    num_queries=3,
                    ingest=False,
                )
            finally:
                tradeoff_module.TRADEOFF_FILE = old_tradeoff_file

        self.assertEqual(embedder.query_calls, [])
        self.assertEqual(len(embedder.document_calls), 1)
        self.assertEqual(len(embedder.document_calls[0]), 3)
        self.assertTrue(all(len(db.search_vectors) == 6 for db in dbs.values()))
        self.assertEqual(df["Recall"].tolist(), [100.0] * 6)


if __name__ == "__main__":
    unittest.main()
