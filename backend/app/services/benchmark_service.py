import sys, pathlib, time, threading, uuid
from datetime import datetime, timezone
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

import pandas as pd
from config import (
    BENCHMARK_DIR,
    FRONTEND_BENCHMARK_DATA_DIR,
    EMBEDDING_MODEL,
    HNSW_EF_CONSTRUCTION,
    HNSW_EF_SEARCH,
    HNSW_M,
    LLM_MODEL,
    MOCK_MODE,
    VECTOR_DIM,
)
from core.data_ingestion.embedder import Embedder
from app.models.benchmark import FullBenchmarkRequest
from .database_service import db_service


class BenchmarkService:
    def __init__(self):
        self._embedder = None
        self._jobs: dict[str, dict] = {}
        self._latest_job_id: str | None = None
        self._jobs_lock = threading.Lock()

    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        return self._embedder

    def run_accuracy(self, corpus_size: int, num_queries: int, ingest: bool) -> list[dict]:
        from core.benchmark.milvus.evaluator import run_accuracy_benchmark

        df: pd.DataFrame = run_accuracy_benchmark(
            db_service.all(), self.embedder,
            corpus_size=corpus_size,
            num_queries=num_queries,
            ingest=ingest,
        )
        return df.to_dict(orient="records")

    def reset_collections(self) -> dict[str, str]:
        results = {}
        for name, engine in db_service.all().items():
            reset_fn = getattr(engine, "reset_collection", None)
            if not callable(reset_fn):
                results[name] = "unsupported"
                continue
            try:
                reset_fn()
                results[name] = "reset"
            except Exception as exc:
                results[name] = f"failed: {exc}"
        return results

    def run_tradeoff(self, ingest: bool) -> list[dict]:
        from core.benchmark.milvus.tradeoff import run_tradeoff_sweep

        df: pd.DataFrame = run_tradeoff_sweep(
            db_service.all(), self.embedder, ingest=ingest,
        )
        return df.to_dict(orient="records")

    def get_setup_summary(self) -> dict:
        return {
            "runtime": {
                "mock_mode": MOCK_MODE,
                "llm_model": LLM_MODEL,
                "embedding_model": EMBEDDING_MODEL,
            },
            "fairness": {
                "vector_dim": VECTOR_DIM,
                "distance_metric": "COSINE",
                "index_type": "HNSW",
                "hnsw_m": HNSW_M,
                "ef_construction": HNSW_EF_CONSTRUCTION,
                "ef_search": HNSW_EF_SEARCH,
            },
            "databases": {
                "Qdrant": {
                    "image": "qdrant/qdrant:latest",
                    "ports": ["6333/http", "6334/grpc"],
                    "ram_limit": "1G",
                    "volume": "./volumes/qdrant_data:/qdrant/storage",
                    "dependencies": [],
                    "collection": "SeminarKnowledge_Base",
                    "index": "HNSW with payload metadata filters",
                    "highlight": "Payload-first filtering for tenant, ACL, source, category, and page constrained RAG.",
                    "rag_logic": "query_points(vector, query_filter, hnsw_ef=64) returns filtered evidence chunks.",
                },
                "Weaviate": {
                    "image": "semitechnologies/weaviate:1.27.2",
                    "ports": ["8080/http", "50051/grpc"],
                    "ram_limit": "1G",
                    "volume": "./volumes/weaviate_data:/var/lib/weaviate",
                    "dependencies": [],
                    "collection": "RAGDocument",
                    "index": "Schema-backed HNSW, vectorizer disabled",
                    "highlight": "Native BM25 plus dense vector hybrid search with alpha=0.5.",
                    "rag_logic": "collection.query.hybrid(query, vector, alpha, filters) fuses keyword and semantic evidence.",
                },
                "Milvus": {
                    "image": "milvusdb/milvus:latest",
                    "ports": ["19530/grpc", "9091/http"],
                    "ram_limit": "2G",
                    "volume": "./volumes/milvus_data:/var/lib/milvus",
                    "dependencies": ["etcd", "MinIO"],
                    "collection": "Seminar_RAG_Collection",
                    "index": "HNSW FLOAT_VECTOR(768), loaded into memory before search",
                    "highlight": "Scale-oriented vector engine with explicit load/flush behavior and separate metadata/object storage dependencies.",
                    "rag_logic": "collection.search(vector, ef=64) after collection.load(); metadata filters compile to Milvus expr.",
                },
            },
        }

    def start_full_benchmark_job(self, req: FullBenchmarkRequest) -> dict:
        job_id = uuid.uuid4().hex
        job = self._new_job(job_id, req)
        with self._jobs_lock:
            self._jobs[job_id] = job
            self._latest_job_id = job_id

        thread = threading.Thread(
            target=self._run_full_job_in_background,
            args=(job_id, req),
            daemon=True,
        )
        thread.start()
        return job

    def get_job(self, job_id: str) -> dict | None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def get_latest_job(self) -> dict | None:
        with self._jobs_lock:
            if not self._latest_job_id:
                return None
            job = self._jobs.get(self._latest_job_id)
            return dict(job) if job else None

    def run_full_benchmark_job(self, req: FullBenchmarkRequest, job_id: str | None = None) -> dict:
        job_id = job_id or uuid.uuid4().hex
        job = self._new_job(job_id, req)
        self._update_job(job_id, job)
        try:
            self._append_job_event(job_id, "prepare", "running", "Preparing benchmark job.")
            self._patch_job(job_id, status="running", stage="prepare", progress=10)
            reset_results = {}
            if req.reset_collections:
                self._append_job_event(job_id, "reset", "running", "Resetting collections before ingest.")
                reset_results = self.reset_collections()
                failed = {name: status for name, status in reset_results.items() if status.startswith("failed:")}
                if failed:
                    raise RuntimeError(f"Collection reset failed: {failed}")
                self._append_job_event(job_id, "reset", "completed", "Collections reset completed.", {"results": reset_results})
            else:
                self._append_job_event(job_id, "reset", "skipped", "Using existing collections.")

            self._patch_job(job_id, stage="accuracy", progress=20, reset=reset_results)
            accuracy = []
            if req.run_accuracy:
                self._append_job_event(job_id, "accuracy", "running", "Running Recall@K and MRR benchmark.")
                accuracy = self.run_accuracy(req.corpus_size, req.num_queries, req.reset_collections)
                self._append_job_event(job_id, "accuracy", "completed", "Accuracy benchmark completed.", {"row_count": len(accuracy)})
            else:
                self._append_job_event(job_id, "accuracy", "skipped", "Accuracy benchmark disabled.")

            self._patch_job(job_id, stage="tradeoff", progress=70, accuracy=accuracy)
            tradeoff = []
            if req.run_tradeoff:
                self._append_job_event(job_id, "tradeoff", "running", "Running top_k trade-off sweep.")
                tradeoff = self.run_tradeoff(False)
                self._append_job_event(job_id, "tradeoff", "completed", "Trade-off sweep completed.", {"row_count": len(tradeoff)})
            else:
                self._append_job_event(job_id, "tradeoff", "skipped", "Trade-off sweep disabled.")

            completed_at = datetime.now(timezone.utc).isoformat()
            self._append_job_event(job_id, "completed", "completed", "Benchmark workflow completed.")
            self._patch_job(
                job_id,
                status="completed",
                stage="completed",
                progress=100,
                accuracy=accuracy,
                tradeoff=tradeoff,
                completed_at=completed_at,
            )
        except Exception as exc:
            self._append_job_event(job_id, "failed", "failed", str(exc))
            self._patch_job(
                job_id,
                status="failed",
                stage="failed",
                error=str(exc),
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        return self.get_job(job_id) or job

    def _run_full_job_in_background(self, job_id: str, req: FullBenchmarkRequest) -> None:
        self.run_full_benchmark_job(req, job_id=job_id)

    def _new_job(self, job_id: str, req: FullBenchmarkRequest) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        return {
            "job_id": job_id,
            "status": "queued",
            "stage": "queued",
            "progress": 0,
            "config": req.model_dump(),
            "setup": self.get_setup_summary(),
            "accuracy": [],
            "tradeoff": [],
            "events": [],
            "error": None,
            "started_at": now,
            "completed_at": None,
        }

    def _update_job(self, job_id: str, job: dict) -> None:
        with self._jobs_lock:
            self._jobs[job_id] = dict(job)
            self._latest_job_id = job_id

    def _patch_job(self, job_id: str, **changes) -> None:
        with self._jobs_lock:
            current = self._jobs.get(job_id, self._new_job(job_id, FullBenchmarkRequest()))
            current.update(changes)
            self._jobs[job_id] = current
            self._latest_job_id = job_id

    def _append_job_event(self, job_id: str, stage: str, status: str, message: str, data: dict | None = None) -> None:
        event = {
            "stage": stage,
            "status": status,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data or {},
        }
        with self._jobs_lock:
            current = self._jobs.get(job_id, self._new_job(job_id, FullBenchmarkRequest()))
            current.setdefault("events", []).append(event)
            self._jobs[job_id] = current
            self._latest_job_id = job_id

    def run_hybrid(
        self,
        query: str,
        filters: dict | None,
        top_k: int,
        alpha: float | None,
    ) -> list[dict]:
        query_embedding = self.embedder.embed_query(query)
        rows: list[dict] = []
        for name, db in db_service.all().items():
            started = time.perf_counter()
            try:
                results = db.search_hybrid(
                    query, query_embedding, filters=filters, top_k=top_k, alpha=alpha
                )
                rows.append({
                    "Engine": name,
                    "Latency_ms": (time.perf_counter() - started) * 1000,
                    "ResultCount": len(results),
                    "Errors": 0,
                })
            except Exception as exc:
                rows.append({
                    "Engine": name,
                    "Latency_ms": 0,
                    "ResultCount": 0,
                    "Errors": 1,
                    "Error": str(exc),
                })
        return rows

    def run_stress(self, rounds: int, chunks_per_round: int) -> dict:
        from core.benchmark.milvus.stress_test import run_stress_test

        return run_stress_test(
            db_service.all(), self.embedder,
            num_rounds=rounds,
            chunks_per_round=chunks_per_round,
        )

    def generate_report(self) -> dict:
        accuracy = self.get_latest_accuracy()
        tradeoff = self.get_latest_tradeoff()
        metrics = self._read_snapshot_csv("metrics.csv", recall_columns=())
        resources = self._get_resource_snapshot()
        generated_at = datetime.now(timezone.utc).isoformat()

        accuracy_table = self._markdown_table(
            accuracy,
            ["Engine", "Recall@1", "Recall@5", "Recall@10", "MRR", "AvgLatency_ms", "Errors"],
        )
        tradeoff_table = self._markdown_table(
            tradeoff[:12],
            ["Engine", "top_k", "Recall", "AvgLatency_ms"],
        )
        metrics_table = self._markdown_table(
            metrics[:12],
            list(metrics[0].keys())[:6] if metrics else [],
        )
        resource_lines = self._format_resources(resources)
        data_note = "" if accuracy or tradeoff or metrics else (
            "\n> Dữ liệu benchmark hiện chưa có sẵn; phần này dùng cấu trúc báo cáo và sẽ tự cập nhật khi có dữ liệu.\n"
        )

        report_md = f"""# Báo cáo seminar: So sánh Vector Database cho RAG

**Chủ đề:** Qdrant vs Weaviate vs Milvus trong hệ thống Retrieval-Augmented Generation (RAG)  
**Thời lượng trình bày:** 30 phút + 15 phút hỏi đáp  
**Generated at:** {generated_at}

## 1. Giới thiệu

Vector database lưu trữ embedding và truy vấn các đoạn dữ liệu gần nghĩa với câu hỏi của người dùng. Trong RAG, lớp này quyết định tài liệu nào được đưa vào LLM, từ đó ảnh hưởng trực tiếp đến độ chính xác, độ trễ và chi phí vận hành.

Ba công cụ được đánh giá là **Qdrant**, **Weaviate**, và **Milvus**. Cả ba đều phổ biến trong hệ sinh thái AI, nhưng khác nhau rõ ở kiến trúc, mô hình triển khai, API và độ phức tạp vận hành.
{data_note}
## 2. Tổng quan công cụ

| Công cụ | Mã nguồn | Điểm mạnh chính | Phù hợp khi |
| --- | --- | --- | --- |
| Qdrant | Apache 2.0 | Rust, nhẹ, payload filtering mạnh, REST/gRPC rõ ràng | Cần latency thấp và vận hành gọn |
| Weaviate | BSD-3-Clause | Schema semantic, GraphQL/REST, hybrid BM25 + dense search | Cần trải nghiệm RAG giàu metadata |
| Milvus | Apache 2.0 | Kiến trúc phân tán, nhiều index, quy mô lớn | Cần scale lớn và tách node chuyên biệt |

## 3. Kiến trúc tổng quan

### Qdrant
Luồng chính: Client -> REST/gRPC API -> Segment Manager -> WAL/Segments -> HNSW Index + Payload Filter. Qdrant nổi bật ở thiết kế gọn, hiệu năng ổn định, và khả năng lọc metadata trực tiếp trong truy vấn vector.

### Weaviate
Luồng chính: Client -> REST/GraphQL API -> Schema/Class Model -> Shards -> HNSW + BM25 -> Hybrid Ranker. Weaviate nổi bật khi demo RAG cần kết hợp truy vấn semantic với keyword search và metadata.

### Milvus
Luồng chính: Client -> Proxy -> Coordinators -> Query/Data/Index Nodes -> Message Broker -> Object Storage + Vector Index. Milvus nổi bật ở kiến trúc phân tán cho workload lớn, nhưng cần giải thích kỹ hơn về vận hành.

## 4. Phương pháp đánh giá

Đánh giá dựa trên bốn trụ cột:

1. **Latency:** thời gian truy vấn và xử lý.
2. **Accuracy/Recall:** khả năng lấy đúng đoạn liên quan.
3. **Tradeoff:** quan hệ giữa recall, top-k, và độ trễ.
4. **Developer Experience:** API, độ dễ triển khai, quan sát lỗi và vận hành.

Các cấu hình benchmark-sensitive phải lấy từ `src/config.py` để đảm bảo công bằng.

## 5. Kết quả accuracy/latest

{accuracy_table}

## 6. Kết quả tradeoff/latest

{tradeoff_table}

## 7. Latency/resource snapshot

{metrics_table}

### Resource snapshot

{resource_lines}

## 8. Thảo luận

- **Qdrant** phù hợp để nhấn mạnh hệ thống nhẹ, API rõ, lọc metadata tốt.
- **Weaviate** phù hợp để nhấn mạnh hybrid search và schema phục vụ ứng dụng RAG.
- **Milvus** phù hợp để nhấn mạnh kiến trúc phân tán và workload quy mô lớn.

Điểm quan trọng khi thuyết trình là không chỉ nói công cụ nào nhanh hơn, mà phải giải thích **vì sao kiến trúc dẫn đến kết quả đó**.

## 9. Kế hoạch demo

1. Mở Overview để giới thiệu bối cảnh.
2. Mở Seminar Hub để trình bày lý thuyết, kiến trúc và bảng so sánh.
3. Mở Presenter Console nền đen, chữ lớn.
4. Chạy một câu hỏi RAG trên cả ba database bằng RAG Chat compact.
5. So sánh latency, số chunk trả về, và chất lượng câu trả lời.

## 10. Kết luận

Qdrant, Weaviate và Milvus đều có thể phục vụ RAG, nhưng lựa chọn tốt phụ thuộc vào mục tiêu: vận hành gọn, hybrid retrieval giàu metadata, hoặc scale phân tán. Seminar nên kết thúc bằng quyết định có điều kiện thay vì tuyên bố một công cụ thắng tuyệt đối.

## Phụ lục

- Link source code
- Link slide
- Video demo
- Tài liệu tham khảo chính thức của Qdrant, Weaviate, Milvus
"""

        slides_md = f"""# Slide outline 30 phút: Vector Database cho RAG

## Slide 1 - Mở đầu (2 phút)
- Chủ đề: Qdrant vs Weaviate vs Milvus.
- Câu hỏi chính: database nào phù hợp cho RAG trong tình huống nào?

## Slide 2 - RAG cần Vector Database để làm gì? (3 phút)
- User query -> embedding -> retrieval -> context -> LLM answer.
- Vector DB quyết định context nào được đưa vào mô hình.

## Slide 3 - Ba công cụ được chọn (3 phút)
- Qdrant: nhẹ, Rust, filter tốt.
- Weaviate: schema + hybrid search.
- Milvus: phân tán, scale lớn.

## Slide 4 - Độ phổ biến và mã nguồn mở (2 phút)
- Qdrant: Apache 2.0.
- Weaviate: BSD-3-Clause.
- Milvus: Apache 2.0.

## Slide 5 - Kiến trúc Qdrant (3 phút)
- API -> Segment Manager -> WAL/Segments -> HNSW.
- Nhấn mạnh latency và payload filtering.

## Slide 6 - Kiến trúc Weaviate (3 phút)
- API -> Schema/Shards -> HNSW + BM25.
- Nhấn mạnh hybrid search.

## Slide 7 - Kiến trúc Milvus (3 phút)
- Proxy -> Coordinators -> Worker Nodes -> Broker/Object Storage.
- Nhấn mạnh scale và operational complexity.

## Slide 8 - Bảng so sánh tiêu chí (3 phút)
- API, index, filtering, scaling, DX, best-fit use case.

## Slide 9 - Benchmark results (4 phút)
- Latency, recall, tradeoff, DX.
- Dẫn chứng từ dashboard hiện tại.

## Slide 10 - Live demo RAG Chat (3 phút)
- Gửi cùng một query tới Qdrant, Weaviate, Milvus.
- So sánh answer, chunks, total latency.

## Slide 11 - Kết luận (1 phút)
- Không có công cụ thắng tuyệt đối.
- Chọn theo workload và năng lực vận hành.

## Slide 12 - Q&A preparation (15 phút hỏi đáp)
- Vì sao không chỉ dùng keyword search?
- Vì sao recall cao nhưng latency cũng tăng?
- Khi nào Milvus đáng dùng dù vận hành phức tạp hơn?

Generated at: {generated_at}
"""

        return {
            "report_md": report_md,
            "slides_md": slides_md,
            "generated_at": generated_at,
            "sources": {
                "metrics": self._source_label("metrics.csv", metrics),
                "accuracy": self._source_label("recall.csv", accuracy),
                "tradeoff": self._source_label("tradeoff.csv", tradeoff),
                "resources": "Live /api/v1/resources snapshot when available; otherwise unavailable note.",
            },
        }

    def get_latest_accuracy(self) -> list[dict]:
        return self._read_snapshot_csv("recall.csv", recall_columns=("Recall@1", "Recall@5", "Recall@10"))

    def get_latest_tradeoff(self) -> list[dict]:
        return self._read_snapshot_csv("tradeoff.csv", recall_columns=("Recall",))

    def _markdown_table(self, rows: list[dict], columns: list[str]) -> str:
        if not rows or not columns:
            return "_Chưa có dữ liệu snapshot để hiển thị._"

        header = "| " + " | ".join(columns) + " |"
        divider = "| " + " | ".join("---" for _ in columns) + " |"
        body = []
        for row in rows:
            values = []
            for column in columns:
                value = row.get(column, "")
                if isinstance(value, float):
                    value = round(value, 4)
                values.append(str(value))
            body.append("| " + " | ".join(values) + " |")
        return "\n".join([header, divider, *body])

    def _get_resource_snapshot(self) -> dict:
        try:
            from core.benchmark.resource_monitor import get_all_stats

            return get_all_stats()
        except Exception as exc:
            return {"unavailable": str(exc)}

    def _format_resources(self, resources: dict) -> str:
        if resources is None:
            return "_Chưa có dữ liệu tài nguyên._"
        if isinstance(resources, pd.DataFrame):
            if resources.empty:
                return "_Chưa có dữ liệu tài nguyên._"
            return self._markdown_table(resources.head(8).to_dict(orient="records"), list(resources.columns)[:6])
        if "unavailable" in resources:
            return f"_Chưa đọc được resource snapshot: {resources['unavailable']}_"
        lines = []
        for name, stats in resources.items():
            if isinstance(stats, dict):
                cpu = stats.get("cpu_percent", stats.get("cpu", "n/a"))
                memory = stats.get("memory_mb", stats.get("memory", "n/a"))
                lines.append(f"- **{name}:** CPU {cpu}, Memory {memory}")
            else:
                lines.append(f"- **{name}:** {stats}")
        return "\n".join(lines) if lines else "_Chưa có dữ liệu tài nguyên._"

    def _source_label(self, filename: str, rows: list[dict]) -> str:
        path = self._find_snapshot_csv(filename)
        if path is not None:
            return f"Snapshot CSV: {path}"
        return "No snapshot rows available." if not rows else "Aggregated from available backend snapshot rows."

    def _read_snapshot_csv(self, filename: str, recall_columns: tuple[str, ...]) -> list[dict]:
        if filename in {"recall.csv", "tradeoff.csv"}:
            path = self._find_snapshot_csv(filename)
            if path is not None:
                df = pd.read_csv(path)
                df = self._merge_per_database_rows(df, filename)
            else:
                df = self._read_per_database_snapshot(filename)
                if df.empty:
                    return []
        else:
            path = self._find_snapshot_csv(filename)
            if path is None:
                return []
            df = pd.read_csv(path)

        for column in recall_columns:
            if column in df.columns and df[column].max() > 1:
                df[column] = df[column] / 100.0
        return df.to_dict(orient="records")

    def _find_snapshot_csv(self, filename: str):
        candidates = [
            BENCHMARK_DIR / filename,
            FRONTEND_BENCHMARK_DATA_DIR / "combined" / filename,
            BENCHMARK_DIR / "weaviate" / filename,
        ]
        return next((path for path in candidates if path.exists()), None)

    def _read_per_database_snapshot(self, filename: str) -> pd.DataFrame:
        frames = []
        for db in ("milvus", "qdrant", "weaviate"):
            path = BENCHMARK_DIR / db / filename
            if path.exists():
                frames.append(pd.read_csv(path))
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    def _merge_per_database_rows(self, primary: pd.DataFrame, filename: str) -> pd.DataFrame:
        per_database = self._read_per_database_snapshot(filename)
        if per_database.empty or "Engine" not in primary.columns or "Engine" not in per_database.columns:
            return primary

        existing = set(primary["Engine"].astype(str))
        missing = per_database[~per_database["Engine"].astype(str).isin(existing)]
        if missing.empty:
            return primary
        return pd.concat([primary, missing], ignore_index=True)

benchmark_service = BenchmarkService()
