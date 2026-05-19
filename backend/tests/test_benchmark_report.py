import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class BenchmarkReportTests(unittest.TestCase):
    def test_report_contains_vietnamese_seminar_material_and_sources(self):
        from app.services.benchmark_service import BenchmarkService

        service = BenchmarkService()

        with (
            mock.patch.object(service, "get_latest_accuracy", return_value=[
                {"Engine": "Qdrant", "Recall@5": 0.91, "MRR": 0.86, "AvgLatency_ms": 42.5},
                {"Engine": "Weaviate", "Recall@5": 0.88, "MRR": 0.83, "AvgLatency_ms": 55.2},
                {"Engine": "Milvus", "Recall@5": 0.93, "MRR": 0.89, "AvgLatency_ms": 61.0},
            ]),
            mock.patch.object(service, "get_latest_tradeoff", return_value=[
                {"Engine": "Qdrant", "top_k": 5, "Recall": 0.9, "AvgLatency_ms": 40.0},
            ]),
        ):
            report = service.generate_report()

        self.assertIn("report_md", report)
        self.assertIn("slides_md", report)
        self.assertIn("generated_at", report)
        self.assertIn("sources", report)
        self.assertIn("Báo cáo seminar", report["report_md"])
        self.assertIn("Qdrant", report["report_md"])
        self.assertIn("Weaviate", report["report_md"])
        self.assertIn("Milvus", report["report_md"])
        self.assertIn("30 phút", report["slides_md"])
        self.assertEqual(set(report["sources"]), {"metrics", "accuracy", "tradeoff", "resources"})


if __name__ == "__main__":
    unittest.main()
