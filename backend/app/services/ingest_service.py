import sys, pathlib, tempfile, os, time
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from core.data_ingestion.processor import load_and_chunk_pdf
from core.data_ingestion.embedder import Embedder
from .database_service import db_service


class IngestService:
    def __init__(self):
        self._embedder: Embedder | None = None

    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        return self._embedder

    async def ingest_pdf(self, file_bytes: bytes, filename: str, db_name: str) -> dict:
        engine = db_service.get(db_name)
        if engine is None:
            raise ValueError(f"Database '{db_name}' is not connected.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            t0 = time.perf_counter()
            chunks = load_and_chunk_pdf(tmp_path)
            embeddings = self.embedder.embed_documents(chunks)
            engine.insert(chunks, embeddings)
            elapsed = (time.perf_counter() - t0) * 1000
            return {"chunks": len(chunks), "db": db_name, "ingest_ms": round(elapsed, 2)}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


ingest_service = IngestService()
