import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class HealthStatusTests(unittest.TestCase):
    def test_database_health_reports_missing_engines_as_false(self):
        from app.services.database_service import DatabaseService

        service = DatabaseService()
        service._catalog = {"Qdrant": object()}

        self.assertEqual(
            service.health(),
            {"Qdrant": True, "Weaviate": False, "Milvus": False},
        )

    def test_health_endpoint_reports_degraded_when_database_is_missing(self):
        from app.routers import health

        with mock.patch.object(
            health.db_service,
            "health",
            return_value={"Qdrant": True, "Weaviate": False, "Milvus": True},
        ):
            response = health.get_health()

        self.assertEqual(response["status"], "degraded")
        self.assertEqual(response["databases"]["Weaviate"], False)


if __name__ == "__main__":
    unittest.main()
