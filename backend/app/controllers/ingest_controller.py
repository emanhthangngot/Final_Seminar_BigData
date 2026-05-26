from fastapi import HTTPException, UploadFile
from app.services.ingest_service import EmptyDocumentError, ingest_service


class IngestController:
    @staticmethod
    async def ingest(file: UploadFile, db: str) -> dict:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=422, detail="Only PDF files are supported.")
        try:
            content = await file.read()
            return await ingest_service.ingest_pdf(content, file.filename, db)
        except EmptyDocumentError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def ingest_all(file: UploadFile) -> dict:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=422, detail="Only PDF files are supported.")
        try:
            content = await file.read()
            return await ingest_service.ingest_pdf_all(content, file.filename)
        except EmptyDocumentError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def reset_all() -> dict:
        try:
            return await ingest_service.reset_all()
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))
