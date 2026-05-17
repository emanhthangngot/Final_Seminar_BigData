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
# Canonical ANN Index Parameters
# ---------------------------------------------------------------------------
# These are the SHARED HNSW parameters all three Vector DBs must use when
# running the "fair" benchmark. Persons B / C / D should import these constants
# in their wrappers instead of hardcoding values, so comparisons are
# apples-to-apples. Change them in one place and the whole benchmark re-runs
# on the same footing.
DISTANCE_METRIC = "COSINE"
HNSW_M = 16
HNSW_EF_CONSTRUCTION = 128
HNSW_EF_SEARCH = 64

INDEX_PARAMS = {
    "metric": DISTANCE_METRIC,
    "index_type": "HNSW",
    "M": HNSW_M,
    "ef_construction": HNSW_EF_CONSTRUCTION,
    "ef_search": HNSW_EF_SEARCH,
}

# ---------------------------------------------------------------------------
# Benchmark Dataset
# ---------------------------------------------------------------------------
# Synthetic corpus scale for reproducible scale testing. Override via env for
# quick smoke tests (e.g. BENCH_CORPUS_SIZE=1000).
BENCH_CORPUS_SIZE = int(os.getenv("BENCH_CORPUS_SIZE", 10000))
BENCH_NUM_QUERIES = int(os.getenv("BENCH_NUM_QUERIES", 200))
BENCH_SEED = int(os.getenv("BENCH_SEED", 42))
CHUNK_ID_PREFIX = "CID"  # every synthetic chunk starts with [CID:xxxx] for ground-truth matching

# ---------------------------------------------------------------------------
# Benchmarking
# ---------------------------------------------------------------------------
BENCHMARK_DIR = SRC_DIR / "core" / "benchmark"
FRONTEND_BENCHMARK_DATA_DIR = BASE_DIR / "frontend" / "public" / "benchmark-data"
METRICS_FILE = BENCHMARK_DIR / "metrics.csv"
TRADEOFF_FILE = BENCHMARK_DIR / "tradeoff.csv"
RECALL_FILE = BENCHMARK_DIR / "recall.csv"
BENCHMARK_DIR.mkdir(parents=True, exist_ok=True)
