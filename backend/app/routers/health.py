from fastapi import APIRouter
from app.services.database_service import db_service
from src.config import EMBEDDING_MODEL, LLM_MODEL, MOCK_MODE, OLLAMA_BASE_URL

router = APIRouter()


@router.get("/health")
def get_health():
    databases = db_service.health()
    return {
        "status": "ok" if all(databases.values()) else "degraded",
        "databases": databases,
        "rag": {
            "mock_mode": MOCK_MODE,
            "ollama_base_url": OLLAMA_BASE_URL,
            "model": LLM_MODEL,
            "embedding_model": EMBEDDING_MODEL,
        },
    }
