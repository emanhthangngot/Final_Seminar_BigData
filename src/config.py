import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Project Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
LOGS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Mock Mode
# When True, the system returns deterministic mock embeddings and LLM
# responses instead of calling a live Ollama instance.  This allows full
# end-to-end testing of the UI, ingestion pipeline, and benchmark dashboard
# without any external model dependency.
# Set to False (or override via .env) once Ollama is running.
# ---------------------------------------------------------------------------
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() in ("true", "1", "yes")

# ---------------------------------------------------------------------------
# Vector Database Configurations
# ---------------------------------------------------------------------------
# Qdrant
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_GRPC_PORT = int(os.getenv("QDRANT_GRPC_PORT", 6334))
QDRANT_HTTP_PORT = int(os.getenv("QDRANT_HTTP_PORT", 6333))

# Weaviate
WEAVIATE_HOST = os.getenv("WEAVIATE_HOST", "localhost")
WEAVIATE_PORT = int(os.getenv("WEAVIATE_PORT", 8080))
WEAVIATE_GRPC_PORT = int(os.getenv("WEAVIATE_GRPC_PORT", 50051))

# Milvus
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = int(os.getenv("MILVUS_PORT", 19530))

# ---------------------------------------------------------------------------
# Ollama (LLM & Embeddings)
# ---------------------------------------------------------------------------
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen:3.6")

# ---------------------------------------------------------------------------
# RAG Settings
# ---------------------------------------------------------------------------
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
VECTOR_DIM = 768
TOP_K = 5

# ---------------------------------------------------------------------------
# Benchmarking
# ---------------------------------------------------------------------------
METRICS_FILE = SRC_DIR / "core" / "benchmark" / "metrics.csv"
