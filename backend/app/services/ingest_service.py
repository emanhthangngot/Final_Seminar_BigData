import sys, pathlib, tempfile, os, time, asyncio
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from core.data_ingestion.processor import load_and_chunk_pdf
from core.data_ingestion.embedder import Embedder
from .database_service import db_service


class EmptyDocumentError(ValueError):
    pass


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
            chunks = await asyncio.to_thread(load_and_chunk_pdf, tmp_path)
            if not chunks:
                raise EmptyDocumentError(
                    f"No extractable text found in '{filename}'. The existing database content was kept unchanged."
                )
            embeddings = await asyncio.to_thread(self.embedder.embed_documents, chunks)
            metadata = self._build_chunk_metadata(filename, len(chunks))
            await asyncio.to_thread(engine.reset_collection)
            await asyncio.to_thread(engine.insert, chunks, embeddings, metadata)
            elapsed = (time.perf_counter() - t0) * 1000
            return {
                "filename": filename,
                "chunks": len(chunks),
                "db": db_name,
                "ingest_ms": round(elapsed, 2),
            }
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
            chunks = await asyncio.to_thread(load_and_chunk_pdf, tmp_path)
            if not chunks:
                raise EmptyDocumentError(
                    f"No extractable text found in '{filename}'. The existing database content was kept unchanged."
                )
            embeddings = await asyncio.to_thread(self.embedder.embed_documents, chunks)
            metadata = self._build_chunk_metadata(filename, len(chunks))
            parse_embed_ms = (time.perf_counter() - started) * 1000

            results: dict[str, dict] = {}
            for db_name, engine in engines.items():
                db_started = time.perf_counter()
                try:
                    await asyncio.to_thread(engine.reset_collection)
                    await asyncio.to_thread(engine.insert, chunks, embeddings, metadata)
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

    async def reset_all(self) -> dict:
        engines = db_service.all()
        if not engines:
            raise ValueError("No databases are connected.")

        results: dict[str, dict] = {}
        for db_name, engine in engines.items():
            started = time.perf_counter()
            try:
                await asyncio.to_thread(engine.reset_collection)
                results[db_name] = {
                    "status": "success",
                    "reset_ms": round((time.perf_counter() - started) * 1000, 2),
                    "error": None,
                }
            except Exception as exc:
                results[db_name] = {
                    "status": "error",
                    "reset_ms": round((time.perf_counter() - started) * 1000, 2),
                    "error": str(exc),
                }

        return {"results": results}

    @staticmethod
    def _build_chunk_metadata(filename: str, chunk_count: int) -> list[dict]:
        source = filename[:1024]
        return [
            {
                "source": source,
                "chunk_id": f"{source}::chunk-{idx + 1:04d}",
                "category": "uploaded_pdf",
                "page": 0,
            }
            for idx in range(chunk_count)
        ]


ingest_service = IngestService()
