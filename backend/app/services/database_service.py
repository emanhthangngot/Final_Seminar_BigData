import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from core.db_clients.qdrant import QdrantWrapper
from core.db_clients.weaviate import WeaviateWrapper
from core.db_clients.milvus import MilvusWrapper
from core.utils.logger import logger


class DatabaseService:
    def __init__(self):
        self._catalog: dict = {}

    async def connect_all(self):
        engines = {
            "Qdrant": QdrantWrapper(),
            "Weaviate": WeaviateWrapper(),
            "Milvus": MilvusWrapper(),
        }
        for name, engine in engines.items():
            try:
                engine.connect()
                self._catalog[name] = engine
                logger.info(f"Connected: {name}")
            except Exception as exc:
                logger.error(f"Failed to connect {name}: {exc}")

    async def close_all(self):
        for _, engine in self._catalog.items():
            close_fn = getattr(engine, "close", None)
            if callable(close_fn):
                try:
                    close_fn()
                except Exception as exc:
                    logger.warning(f"Close engine warning: {exc}")
        self._catalog.clear()

    def get(self, name: str):
        return self._catalog.get(name)

    def all(self) -> dict:
        return self._catalog

    def health(self) -> dict[str, bool]:
        return {name: True for name in self._catalog}


db_service = DatabaseService()
