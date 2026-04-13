import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Project Paths
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
LOGS_DIR.mkdir(exist_ok=True)

# Vector Database Configurations
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

# Ollama (LLM & Embeddings)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b") # Plan said Qwen3.5, using 2.5 as a realistic default

# RAG Settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
VECTOR_DIM = 768

# Benchmarking
METRICS_FILE = SRC_DIR / "benchmark" / "metrics.csv"
