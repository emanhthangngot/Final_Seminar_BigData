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

    async def ingest_pdf_all(self, file_bytes: bytes, filename: str) -> dict:
        engines = db_service.all()
        if not engines:
            raise ValueError("No databases are connected.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            started = time.perf_counter()
            chunks = load_and_chunk_pdf(tmp_path)
            embeddings = self.embedder.embed_documents(chunks)
            parse_embed_ms = (time.perf_counter() - started) * 1000

            results: dict[str, dict] = {}
            for db_name, engine in engines.items():
                db_started = time.perf_counter()
                try:
                    engine.insert(chunks, embeddings)
                    results[db_name] = {
                        "status": "success",
                        "chunks": len(chunks),
                        "ingest_ms": round((time.perf_counter() - db_started) * 1000, 2),
                        "error": None,
                    }
                except Exception as exc:
                    results[db_name] = {
                        "status": "error",
                        "chunks": 0,
                        "ingest_ms": round((time.perf_counter() - db_started) * 1000, 2),
                        "error": str(exc),
                    }

            return {
                "filename": filename,
                "chunks": len(chunks),
                "parse_embed_ms": round(parse_embed_ms, 2),
                "results": results,
            }
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


ingest_service = IngestService()
