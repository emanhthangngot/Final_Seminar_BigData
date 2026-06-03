import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class BenchmarkJobAndSetupTests(unittest.TestCase):
    def test_setup_summary_exposes_shared_config_and_database_details(self):
        from app.services.benchmark_service import BenchmarkService

        summary = BenchmarkService().get_setup_summary()

        self.assertEqual(summary["runtime"]["embedding_model"], "nomic-embed-text")
        self.assertEqual(summary["fairness"]["vector_dim"], 768)
        self.assertEqual(summary["fairness"]["index_type"], "HNSW")
        self.assertEqual(summary["databases"]["Qdrant"]["ports"], ["6333/http", "6334/grpc"])
        self.assertIn("payload", summary["databases"]["Qdrant"]["highlight"].lower())
        self.assertIn("MinIO", summary["databases"]["Milvus"]["dependencies"])
        self.assertIn("etcd", summary["databases"]["Milvus"]["dependencies"])

    def test_full_benchmark_job_runs_accuracy_and_tradeoff(self):
        from app.models.benchmark import FullBenchmarkRequest
        from app.services.benchmark_service import BenchmarkService

        service = BenchmarkService()

        with (
            mock.patch.object(service, "run_accuracy", return_value=[
                {"Engine": "Qdrant", "Recall@10": 9.5, "MRR": 0.04, "AvgLatency_ms": 4.8, "Errors": 0},
            ]) as accuracy,
            mock.patch.object(service, "run_tradeoff", return_value=[
                {"Engine": "Qdrant", "top_k": 50, "Recall": 27.0, "AvgLatency_ms": 5.8},
            ]) as tradeoff,
        ):
            job = service.run_full_benchmark_job(FullBenchmarkRequest())

        self.assertEqual(job["status"], "completed")
        self.assertEqual(job["progress"], 100)
        self.assertEqual(job["accuracy"][0]["Engine"], "Qdrant")
        self.assertEqual(job["tradeoff"][0]["top_k"], 50)
        self.assertIn("events", job)
        self.assertEqual(job["events"][-1]["stage"], "completed")
        accuracy.assert_called_once()
        tradeoff.assert_called_once()

    def test_full_benchmark_resets_collections_before_ingest(self):
        from app.models.benchmark import FullBenchmarkRequest
        from app.services.benchmark_service import BenchmarkService

        service = BenchmarkService()

        with (
            mock.patch.object(service, "reset_collections", return_value={"Qdrant": "reset"}) as reset,
            mock.patch.object(service, "run_accuracy", return_value=[]) as accuracy,
            mock.patch.object(service, "run_tradeoff", return_value=[]),
        ):
            job = service.run_full_benchmark_job(FullBenchmarkRequest())

        self.assertEqual(job["status"], "completed")
        self.assertEqual(job["reset"], {"Qdrant": "reset"})
        reset.assert_called_once()
        accuracy.assert_called_once_with(10_000, 200, True)

    def test_full_benchmark_can_reuse_existing_collections(self):
        from app.models.benchmark import FullBenchmarkRequest
        from app.services.benchmark_service import BenchmarkService

        service = BenchmarkService()

        with (
            mock.patch.object(service, "reset_collections") as reset,
            mock.patch.object(service, "run_accuracy", return_value=[]) as accuracy,
            mock.patch.object(service, "run_tradeoff", return_value=[]),
        ):
            job = service.run_full_benchmark_job(FullBenchmarkRequest(reset_collections=False))

        self.assertEqual(job["status"], "completed")
        reset.assert_not_called()
        accuracy.assert_called_once_with(10_000, 200, False)

    def test_latest_snapshot_keeps_primary_rows_and_adds_missing_engines(self):
        from app.services.benchmark_service import BenchmarkService

        service = BenchmarkService()

        with tempfile.TemporaryDirectory() as tmp:
            primary_path = Path(tmp) / "recall.csv"
            pd.DataFrame([
                {"Engine": "Milvus", "Recall@10": 44.0, "AvgLatency_ms": 4.14},
            ]).to_csv(primary_path, index=False)

            per_db = pd.DataFrame([
                {"Engine": "Milvus", "Recall@10": 44.0, "AvgLatency_ms": 4.14},
                {"Engine": "Qdrant", "Recall@10": 9.5, "AvgLatency_ms": 4.83},
                {"Engine": "Weaviate", "Recall@10": 9.5, "AvgLatency_ms": 14.47},
            ])

            with (
                mock.patch.object(service, "_find_snapshot_csv", return_value=primary_path),
                mock.patch.object(service, "_read_per_database_snapshot", return_value=per_db),
            ):
                rows = service._read_snapshot_csv("recall.csv", ("Recall@10",))

        self.assertEqual([row["Engine"] for row in rows], ["Milvus", "Qdrant", "Weaviate"])
        self.assertEqual(rows[0]["Recall@10"], 0.44)
        self.assertEqual(rows[1]["Recall@10"], 0.095)


if __name__ == "__main__":
    unittest.main()
