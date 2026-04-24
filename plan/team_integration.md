# Kế hoạch Tổng thể & Tích hợp Nhóm (Team Integration)

## 1. Mục tiêu Tối Thượng
Hoàn thiện toàn bộ bài Benchmark kiểm thử RAG Project. Nhằm mục đích thuyết trình phân tích Seminar môn Big Data trực quan, có giá trị học thuật điểm 10, chứng thực những Trade-offs so sánh tài nguyên của hệ ba Vector Database lớn: Qdrant, Weaviate, Milvus.

Hệ thống được xây dựng dưới dạng **Full-Stack Web Application**:
- **Frontend:** React 18 + Three.js + Vite (chạy tại `http://localhost:5173`)
- **Backend:** FastAPI MVC (chạy tại `http://localhost:8000`)
- **Core:** `src/core/` Python modules — dùng chung bởi backend và CLI

## 2. Ràng buộc Môi trường Đồng nhất Hệ thống

- **Ngôn ngữ Code:** Python 3.11 (backend + core), Node 20 LTS (frontend).
- **Python Dependency:** `requirements.txt` + `backend/requirements.txt`.
- **Frontend Dependency:** `frontend/package.json` (npm install).
- **Infrastructure:** `docker-compose.yml` — 1 lệnh `docker compose up` chạy tất cả.
- **Tiêu chuẩn Dữ liệu:** Ollama `nomic-embed-text` → vector 768 chiều. Fixed Seed = 42.

## 3. Luồng Dữ Liệu (Data Flow)

```
User Browser (React + Three.js)
    ↓ HTTP/JSON
FastAPI Backend (:8000/api/v1/*)
    ↓ Python function calls
src/core/ (shared business logic)
    ↓ Python SDK
Vector DBs (Qdrant :6333 | Weaviate :8080 | Milvus :19530)
    + Ollama (:11434)
```

## 4. Chuẩn Giao Tiếp & Fairness Protocol

Việc thiết kế phải tuân thủ hướng đối tượng và phục vụ 4 trụ cột đánh giá:
**Latency · Recall@K / MRR · Recall-vs-Latency Pareto Curve · DX Matrix**.

### Fairness Protocol — Bắt buộc cho cả B, C, D

Không được hardcode bất kỳ giá trị benchmark-sensitive nào. Tất cả phải đọc từ
`src.config`:

```python
from src.config import INDEX_PARAMS  # {metric, index_type, M, ef_construction, ef_search}
```

- **HNSW M**, **ef_construction**, **ef_search**, **distance metric** → giống nhau cho cả 3 DB.
- **Corpus**: lấy từ `src.core.benchmark.dataset.build_corpus()` (seed cố định).
- **Queries**: lấy từ `build_golden_queries()` (seed cố định).
- **Ground truth**: so khớp `[CID:…]` tag — không dùng substring / LLM judge.

Reviewer (A) sẽ reject PR nếu wrapper nào còn literal `M=16` / `ef=64` hardcoded.

```python
# Interface bắt buộc tại src/core/db_clients/base.py
class BaseVectorDB(ABC):
    @abstractmethod
    def connect(self): pass

    @abstractmethod
    @time_profiler
    def insert(self, chunks: list, metadata: list): pass

    @abstractmethod
    @time_profiler
    def search(self, query: list, top_k: int = 5) -> list[str]: pass

    @abstractmethod
    @time_profiler
    def search_hybrid(self, query_text: str, query_embedding: list, filters: dict, top_k: int = 5) -> list[str]: pass
```

Ba cá nhân DB (B, C, D) tuyệt đối nối Interface chính xác với Orchestration Pipeline mà A gọi xuống qua FastAPI controllers.

## 5. API Contract (Frontend ↔ Backend)

| Endpoint | Method | Request | Response | Dùng ở React Page |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/health` | GET | — | `{databases: {Qdrant: bool, ...}}` | Navbar, Dashboard |
| `/api/v1/metrics` | GET | — | `list[MetricRow]` | `/latency` |
| `/api/v1/ingest` | POST | `file: PDF, db: str` | `{chunks, ingest_ms}` | `/rag-chat` |
| `/api/v1/chat` | POST | `{query, db}` | `{answer, latency_ms}` | `/rag-chat` |
| `/api/v1/benchmark/accuracy` | POST | `{corpus_size, num_queries, ingest}` | `list[AccuracyResult]` | `/accuracy` |
| `/api/v1/benchmark/tradeoff` | POST | `{ingest}` | `list[TradeoffResult]` | `/tradeoff` |
| `/api/v1/benchmark/stress` | POST | `{rounds, chunks_per_round}` | `dict` | `/dashboard` |
| `/api/v1/resources` | GET | — | `list[ResourceRow]` | `/latency` |
| `/api/v1/dx` | GET | — | `{Qdrant: {sloc, ...}, ...}` | `/dx-score` |

## 6. Quản lý Source Code Control (GitHub)

- **Branching Rule:** `task/<giai_doan>/<member_id>/<ten_tinh_nang>`. VD: `task/G2/memA/react-dashboard`.
- **Merge Logic:** Muốn merge vào `main` bắt buộc phải có Pull Request, yêu cầu 1 người approve.
- **Commit Format:** `[LAYER/DB] Action: Description`. VD: `[FRONTEND] feat: VectorSpaceScene Three.js`.

## 7. Hướng dẫn Khởi Động (Quick Start)

```bash
# Option 1: Docker (production-like)
docker compose up -d
# → Frontend: http://localhost:5173
# → Backend API: http://localhost:8000/docs

# Option 2: Development (hot reload)
# Terminal 1 — Backend
cd backend
pip install -r ../requirements.txt -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 8. Output Giao Nộp Thành Phẩm (Deliverables)

1. **Source Code Zip:** `README.md` hướng dẫn `docker compose up` → thầy giáo test được.
2. **Báo Cáo Word (Technical Report):** 10-15 trang, Architecture Diagram từng CSDL + Full-Stack diagram, biểu đồ từ React Dashboard.
3. **Thuyết trình Slide:** 30 phút. Ảnh chụp màn hình React Dashboard + Three.js 3D scene.
4. **Video Demo Live:** Demo React UI → Three.js VectorSpace → RAG Chat → Accuracy Benchmark.
