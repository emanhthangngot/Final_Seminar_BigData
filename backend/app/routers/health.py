from fastapi import APIRouter
from app.services.database_service import db_service
from src.config import EMBEDDING_MODEL, LLM_MODEL, MOCK_MODE, OLLAMA_BASE_URL

router = APIRouter()


@router.get("/health")
def get_health():
    return {
        "status": "ok",
        "databases": db_service.health(),
        "rag": {
            "mock_mode": MOCK_MODE,
            "ollama_base_url": OLLAMA_BASE_URL,
            "model": LLM_MODEL,
            "embedding_model": EMBEDDING_MODEL,
        },
    }
