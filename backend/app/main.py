from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import benchmark, chat, ingest, metrics, resources, dx, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.database_service import db_service
    await db_service.connect_all()
    yield
    await db_service.close_all()


app = FastAPI(
    title="VectorDB Benchmark API",
    description="FastAPI backend for RAG benchmarking across Qdrant, Weaviate, Milvus",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(health.router,     prefix=PREFIX, tags=["Health"])
app.include_router(metrics.router,    prefix=PREFIX, tags=["Metrics"])
app.include_router(ingest.router,     prefix=PREFIX, tags=["Ingestion"])
app.include_router(benchmark.router,  prefix=PREFIX, tags=["Benchmark"])
app.include_router(chat.router,       prefix=PREFIX, tags=["Chat"])
app.include_router(resources.router,  prefix=PREFIX, tags=["Resources"])
app.include_router(dx.router,         prefix=PREFIX, tags=["DX"])
