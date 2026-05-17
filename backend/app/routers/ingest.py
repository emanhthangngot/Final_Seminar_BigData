from fastapi import APIRouter, UploadFile, File, Form
from app.controllers.ingest_controller import IngestController

router = APIRouter()


@router.post("/ingest")
async def ingest(file: UploadFile = File(...), db: str = Form(...)):
    return await IngestController.ingest(file, db)


@router.post("/ingest/all")
async def ingest_all(file: UploadFile = File(...)):
    return await IngestController.ingest_all(file)
