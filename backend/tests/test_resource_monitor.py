import sys
import types
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


class ResourceMonitorTests(unittest.TestCase):
    def test_missing_default_docker_socket_does_not_call_docker_sdk(self):
        from src.core.benchmark.milvus import resource_monitor

        fake_docker = types.SimpleNamespace(
            from_env=mock.Mock(side_effect=FileNotFoundError("docker.sock"))
        )

        with (
            mock.patch.dict(sys.modules, {"docker": fake_docker}),
            mock.patch.dict("os.environ", {}, clear=True),
            mock.patch.object(resource_monitor.Path, "exists", return_value=False),
            mock.patch.object(resource_monitor, "_DOCKER_SOCKET_MISSING_LOGGED", False),
            mock.patch.object(resource_monitor, "_DOCKER_UNAVAILABLE_WARNED", False),
            mock.patch.object(resource_monitor.logger, "info") as info,
        ):
            result = resource_monitor.get_all_stats()
            second_result = resource_monitor.get_all_stats()

        self.assertTrue(result.empty)
        self.assertTrue(second_result.empty)
        self.assertEqual(fake_docker.from_env.call_count, 0)
        self.assertEqual(info.call_count, 1)
        self.assertIn("Docker socket is not mounted", info.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
