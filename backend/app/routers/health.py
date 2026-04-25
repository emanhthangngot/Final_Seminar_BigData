from fastapi import APIRouter
from app.services.database_service import db_service

router = APIRouter()


@router.get("/health")
def get_health():
    return {"status": "ok", "databases": db_service.health()}
