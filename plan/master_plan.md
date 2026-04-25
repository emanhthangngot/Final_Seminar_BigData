# Kế hoạch Tổng thể (Master Plan) - RAG Benchmarking Project

- **Phạm vi:** So sánh hiệu năng (Benchmarking) 3 hệ quản trị Vector Database: **Qdrant**, **Weaviate**, và **Milvus** dựa trên kiến trúc Retrieval-Augmented Generation (RAG). Hệ thống phải xử lý được tệp PDF, thực hiện chunking, embedding và truy vấn context để LLM trả lời.
- **Không bao gồm:** Các dịch vụ Cloud trả phí (OpenAI, Pinecone), các mô hình LLM trực tuyến để đảm bảo tính an toàn dữ liệu, quyền riêng tư và chi phí vận hành 0đ.

## Danh sách thành viên

| Mã | Mã số sinh viên | Họ và tên | Vai trò chính | Kỹ năng bổ trợ |
| :--- | :--- | :--- | :--- | :--- |
| A | 23120099 | Lê Xuân Trí | RAG Architect & Full-Stack Lead (React + FastAPI) | React, Three.js, FastAPI, LangChain |
| B | 23120185 | Nguyễn Hồ Anh Tuấn | Weaviate Database Specialist | Docker, Golang Patterns, gRPC |
| C | 23120166 | Trần Hữu Kim Thành | Milvus Database Specialist | C++ Core Logic, etcd, Distributed Systems |
| D | 23120165 | Trần Lê Trung Trực | Qdrant Database Specialist | Rust Performance, Vector Algebra, API Design |

## Tech Stack (Updated)

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Three.js + Vite | React Router, Zustand, Recharts, @react-three/fiber |
| **Backend** | FastAPI (Python 3.11) | MVC structure: controllers / services / routers / models |
| **Core Logic** | `src/core/` (shared) | Benchmark modules, DB clients, embedder — unchanged |
| **Infrastructure** | Docker Compose | Backend + Frontend containers added alongside DBs |
| **Embedding** | Ollama `nomic-embed-text` | 768-dim vectors, local, free |
| **LLM** | Ollama `qwen2.5:3b` | Local, free, MOCK_MODE fallback |

## Cấu trúc thư mục dự án (Updated)

```text
.
├── frontend/                    # React + Three.js SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Navbar, Layout
│   │   │   ├── three/           # VectorSpaceScene, PerformanceGlobe
│   │   │   ├── charts/          # LatencyChart, RecallChart, TradeoffCurve
│   │   │   └── ui/              # MetricCard, DBBadge, UploadPanel
│   │   ├── pages/               # Dashboard, LatencyPage, AccuracyPage, …
│   │   ├── services/api.js      # Axios wrapper → FastAPI /api/v1/
│   │   └── store/               # Zustand global state
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # FastAPI MVC
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan + CORS
│   │   ├── controllers/         # Business logic layer
│   │   ├── services/            # Shared service singletons
│   │   ├── models/              # Pydantic request/response schemas
│   │   └── routers/             # Thin route definitions
│   ├── core -> ../src/core      # Symlink — shares benchmark/db/embedding logic
│   ├── config.py -> ../src/config.py
│   └── Dockerfile
│
├── src/                         # Shared Python core (unchanged structure)
│   ├── core/
│   │   ├── benchmark/           # profiler, evaluator, tradeoff, dataset, stress_test
│   │   ├── db_clients/          # base, qdrant, weaviate, milvus
│   │   ├── data_ingestion/      # processor, embedder, generator
│   │   └── utils/               # logger, helpers, dx_analyzer
│   └── config.py
│
├── docker-compose.yml           # All services: DBs + Ollama + backend + frontend
├── requirements.txt             # Python dependencies
└── plan/
```

## Phân công chi tiết theo giai đoạn (Detailed Timeline)

### Giai đoạn 1 - Thiết lập Hạ tầng và Ingestion Pipeline (Tuần 1)

| Thành viên | Frontend / Backend Setup | Database Setup & Configuration | Embedding & Logic Implementation |
| :--- | :--- | :--- | :--- |
| **A** | Khởi tạo React+Vite project, cấu trúc FastAPI MVC, GitHub CI/CD | Khởi tạo repo cấu trúc `frontend/` + `backend/` | Viết `processor.py`, tích hợp Ollama API (Embeddings) |
| **B** | | Container hóa Weaviate (port 8080/50051) | Thiết lập Schema `RAGDocument` và kết nối gRPC |
| **C** | | Deploy Milvus Standalone (etcd/minio) | Tạo Collection, định nghĩa Field (dim=768) |
| **D** | | Cài đặt Qdrant với Volume Persistence | Khởi tạo Collection, cấu hình Distance Metric (Cosine) |

### Giai đoạn 2 - Phát triển API + UI Dashboard (Tuần 2)

| Thành viên | Frontend Development | Backend API | DB Integration |
| :--- | :--- | :--- | :--- |
| **A** | Dashboard React với Three.js VectorSpaceScene, 7 pages hoàn chỉnh | FastAPI routers: `/benchmark`, `/chat`, `/ingest`, `/metrics` | Kịch bản Evaluator (Recall@K) & DX Score |
| **B** | | | Triển khai `search_hybrid()` Weaviate + Fairness Protocol |
| **C** | | | Triển khai `search_hybrid()` Milvus + Fairness Protocol |
| **D** | | | Triển khai `search_hybrid()` Qdrant + Fairness Protocol |

### Giai đoạn 3 - Nâng cao: Benchmarking & 3D Visualization (Tuần 3)

| Thành viên | 3D Visualization | Benchmark Analytics | DX Analytics |
| :--- | :--- | :--- | :--- |
| **A** | Hoàn thiện PerformanceGlobe, TradeoffCurve, RecallRadar | `tradeoff.run_tradeoff_sweep`, `evaluator.run_accuracy_benchmark` | DX Matrix: SLOC + cyclomatic + imports |
| **B** | | Phân tích Recall Weaviate, Latency với filter phức tạp | Viết đánh giá API DX Weaviate |
| **C** | | Phân tích Recall Milvus, `expr` filter latency | Viết đánh giá Schema DX Milvus |
| **D** | | Phân tích Recall Qdrant, Payload filter performance | Viết đánh giá Rust SDK DX Qdrant |

### Giai đoạn 4 - Báo cáo, Đóng gói & Seminar (Tuần 4)

- **Cả nhóm:** Viết báo cáo học thuật (PDF) phân tích chi tiết bộ 4 trụ cột:
  - **Latency & Resources:** Tốc độ lưu / tìm kiếm, RAM/CPU qua Docker stats.
  - **Accuracy (Recall@K):** DB nào tìm kiếm chính xác nhất trả lời câu hỏi.
  - **Filtering & Hybrid:** DB nào chịu tải tốt nhất khi thêm điều kiện lọc.
  - **DX Matrix:** Đánh giá độ khó triển khai thực tế.
- **A & B:** Thiết kế Slide thuyết trình tập trung vào tính tương phản (Trade-offs) và kết quả Benchmark 4 Trụ cột.
- **C & D:** Quay video Live Demo chứng minh Recall@K, hiển thị DX Matrix. **Tuyệt đối không gộp bước cài đặt/config vào phần demo.**

---

## Đầu ra mong đợi (Detailed Deliverables)

### Phần 1 - Full-Stack Web App & RAG Core (Thành viên A)

| Yêu cầu | Sản phẩm bàn giao cụ thể | Chỉ số đánh giá kỹ thuật |
| :--- | :--- | :--- |
| React Frontend | 7 pages + Three.js 3D VectorSpaceScene | Load < 2s, 60fps animation, responsive |
| FastAPI Backend | MVC với 8 routers, Pydantic schemas | API response < 200ms overhead |
| `processor.py` | Class xử lý PDF đa luồng, hỗ trợ Tiếng Việt | `chunks_count` > 0, `avg_len` ~ 1000 chars |
| Embedding | Vector 768 chiều ổn định, chuẩn hóa | `vector_dim=768`, 100% khớp model `nomic-embed-text` |

### Phần 2 - Vector Databases Benchmarking (Thành viên B, C, D)

| Database | Mục tiêu kỹ thuật tối thiểu | Chỉ số đo lường thực tế |
| :--- | :--- | :--- |
| **Weaviate** | Hoạt động qua gRPC, không lỗi Batch | `latency_ms` (mean/p95), `memory_usage_mb` |
| **Milvus** | Search thành công sau khi Load, Index Ready | `ingest_speed` (vectors/sec), `cpu_utilization` |
| **Qdrant** | Search với metadata filtering, RAM ổn định | `search_latency_ms`, `ram_at_idle_vs_peak` |

### Tiêu chí chung cho Benchmarking

- Sử dụng `@time_profiler` cho mọi phương thức `insert` và `search`.
- Dữ liệu `metrics.csv` phải bao gồm: `timestamp`, `database`, `operation`, `duration_ms`.
- Biểu đồ React/Recharts phải tương tác được: Cho phép lọc theo từng DB hoặc so sánh trực diện.
- Three.js scene phải hiển thị trực quan sự khác biệt giữa 3 DB (VectorSpaceScene, PerformanceGlobe).

### Methodology Bắt Buộc (Fairness Protocol)

Để benchmark có giá trị học thuật (không bị "bẻ" trong Q&A), cả 3 DB phải tuân thủ:

1. **Canonical Index Params** — Tất cả DB đọc HNSW params từ `src.config.INDEX_PARAMS`
   (`M=16`, `ef_construction=128`, `ef_search=64`, `metric=COSINE`). Không ai được
   hardcode giá trị khác. B/C/D có trách nhiệm pass params vào code `connect()`.
2. **Shared Corpus & Queries** — Sử dụng module `src.core.benchmark.dataset`:
   - Synthetic corpus mặc định **10.000 chunks** (config `BENCH_CORPUS_SIZE`),
     seed cố định (`BENCH_SEED=42`) → fully reproducible.
   - Mỗi chunk gắn nhãn `[CID:NNNNNNN]` ở đầu → ground truth = exact ID match.
   - Golden queries lấy ngẫu nhiên 14-word window từ chunk → embedding gần chunk gốc.
3. **Ground-Truth Recall** — `evaluator.run_accuracy_benchmark()` trả về
   **Recall@1 / @5 / @10 + MRR + AvgLatency_ms + Errors**. Không còn substring match.
4. **Recall vs Latency Curve** — `tradeoff.run_tradeoff_sweep()` sweep
   `top_k ∈ {1, 2, 5, 10, 20, 50}`, xuất curve hiển thị trên TradeoffCurve React component
   (điểm góc trên-trái = tốt nhất) — đây là chart quyết định trong slide.
5. **DX Score nâng cấp** — `dx_analyzer` giờ tính SLOC + cyclomatic complexity
   + public methods + 3rd-party imports → điểm tổng hợp thay vì chỉ đếm dòng.

### Bộ 4 Trụ Cột Đánh Giá (Final)

| Trụ cột | Metric | Module | Frontend Page |
| :--- | :--- | :--- | :--- |
| **Latency & Resources** | `Duration_ms` (p50/p95), CPU%, RAM MB | `profiler.py`, `resource_monitor.py` | `/latency` |
| **Accuracy (RAG Quality)** | Recall@1/5/10, MRR | `evaluator.py`, `dataset.py` | `/accuracy` |
| **Accuracy-Speed Tradeoff** | Recall vs AvgLatency curve | `tradeoff.py` | `/tradeoff` |
| **DX (Developer Experience)** | SLOC + cyclomatic + imports → score | `dx_analyzer.py` | `/dx-score` |

---

## Quản lý Rủi ro & Giải pháp (Risk Management)

| Rủi ro | Mức độ | Giải pháp phòng ngừa |
| :--- | :--- | :--- |
| Tràn RAM khi chạy 3 DB | **Cao** | Thiết lập `mem_limit` trong Docker Compose, tắt DB không sử dụng. |
| Treo Ollama khi nạp hàng loạt | **Trung bình** | Implement cơ chế `backoff/retry` và nạp theo batch nhỏ (50 vectors). |
| Sai dimension vector (768) | **Nghiêm trọng** | Thêm hàm `assert len(vector) == 768` ngay sau bước embedding. |
| Mất dữ liệu khi DB Restart | **Trung bình** | Luôn khai báo `volumes` map ra folder đĩa host `./volumes/` trong Docker. |
| CORS lỗi Frontend ↔ Backend | **Thấp** | Backend CORS allow `localhost:5173`, proxy `/api` trong Vite config. |

---

## Quy tắc Branching và Commit chuyên nghiệp

- **Branching Rule:** `task/<phase>/<mem_id>/<feature_short>` (VD: `task/G2/memA/react-dashboard`).
- **Review Policy:** Ít nhất 1 thành viên khác phải approve Pull Request trước khi merge.
- **Commit Format:** `[LAYER/DB_NAME] Action: Description` (VD: `[FRONTEND] feat: add VectorSpaceScene Three.js`).

## Yêu cầu về code & Môi trường

- **Python Version:** 3.11 (Yêu cầu bắt buộc để đảm bảo tương thích thư viện).
- **Node.js Version:** 20 LTS.
- **Virtual Env:** Sử dụng `venv` hoặc `conda`. Không cài library global.

### Hướng dẫn khởi động nhanh (Quick Start)

```bash
# 1. Khởi động toàn bộ infrastructure
docker compose up -d

# 2. Development mode (hot reload)
# Terminal 1 — Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```
