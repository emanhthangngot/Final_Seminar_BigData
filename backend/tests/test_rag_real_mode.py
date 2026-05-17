import importlib
import os
import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


def reload_config(**env):
    import src.config as config

    keys = ("MOCK_MODE", "OLLAMA_BASE_URL", "OLLAMA_HOST", "LLM_MODEL", "EMBEDDING_MODEL")
    patched = {key: os.environ[key] for key in os.environ if key not in keys}
    patched.update(env)
    with mock.patch.dict(os.environ, patched, clear=True):
        return importlib.reload(config)


class RAGRealModeTests(unittest.TestCase):
    def test_config_defaults_to_real_ollama_mode(self):
        config = reload_config()

        self.assertIs(config.MOCK_MODE, False)
        self.assertEqual(config.OLLAMA_BASE_URL, "http://localhost:11434")
        self.assertEqual(config.LLM_MODEL, "qwen2.5:3b")
        self.assertEqual(config.EMBEDDING_MODEL, "nomic-embed-text")

    def test_config_accepts_compose_ollama_host_alias(self):
        config = reload_config(OLLAMA_HOST="http://ollama:11434")

        self.assertEqual(config.OLLAMA_BASE_URL, "http://ollama:11434")

    def test_chat_response_includes_runtime_metadata(self):
        from app.models.chat import ChatResponse

        response = ChatResponse(
            answer="ok",
            db="Qdrant",
            latency_ms=12.3,
            context_chunks=["chunk"],
            model="qwen2.5:3b",
            embedding_model="nomic-embed-text",
            mock_mode=False,
        )

        self.assertIs(response.mock_mode, False)
        self.assertEqual(response.model, "qwen2.5:3b")
        self.assertEqual(response.embedding_model, "nomic-embed-text")


if __name__ == "__main__":
    unittest.main()
