# RAG Benchmark — Qdrant vs Weaviate vs Milvus

Hệ thống Full-Stack so sánh hiệu năng 3 Vector Database: **Qdrant (Rust)**, **Weaviate (Go)**, **Milvus (C++)** qua kiến trúc RAG. Giao diện React + Three.js 3D, backend FastAPI MVC, toàn bộ chạy local bằng Docker.

## Nhóm Thực Hiện

| Mã | Họ và tên | Vai trò |
| :- | :- | :- |
| A | Lê Xuân Trí | RAG Architect & Full-Stack Lead (React + FastAPI) |
| B | Nguyễn Hồ Anh Tuấn | Weaviate Specialist |
| C | Trần Hữu Kim Thành | Milvus Specialist |
| D | Trần Lê Trung Trực | Qdrant Specialist |

---

## Kiến Trúc Hệ Thống

```
Browser (React + Three.js :5173)
    ↕ HTTP /api/v1/*
FastAPI Backend (:8000)   ← MVC: controllers / services / routers
    ↕ Python SDK
Qdrant (:6333) | Weaviate (:8080) | Milvus (:19530)
    + Ollama (:11434) — nomic-embed-text + qwen2.5:3b
```

**Cấu trúc thư mục:**
```
.
├── frontend/          React 18 + Three.js + Vite
├── backend/           FastAPI MVC
├── src/core/          Shared Python: DB clients, benchmark, embedder
├── src/config.py      Constants, INDEX_PARAMS, MOCK_MODE
└── docker-compose.yml Toàn bộ services
```

---

## Yêu Cầu Hệ Thống

| Thành phần | Phiên bản tối thiểu |
| :- | :- |
| Docker + Docker Compose V2 | Docker 24+ |
| Python | 3.11 |
| Node.js | 20 LTS |
| RAM khuyên dùng | 8 GB (chạy 3 DB + Ollama cùng lúc) |

---

## Cách Chạy

### Option 1 — Docker (khuyên dùng, 1 lệnh)

```bash
docker compose up -d
```

Sau khi tất cả container healthy:

| Service | URL |
| :- | :- |
| React Dashboard | http://localhost:5173 |
| FastAPI Docs (Swagger) | http://localhost:8000/docs |
| Qdrant UI | http://localhost:6333/dashboard |
| Weaviate | http://localhost:8080 |
| Milvus | localhost:19530 |

> **Lần đầu chạy:** Container `ollama-init` sẽ tự pull `nomic-embed-text` và `qwen2.5:3b` — mất vài phút tuỳ tốc độ mạng.

Kiểm tra tất cả services đang chạy:
```bash
docker compose ps
```

Xem log backend:
```bash
docker compose logs -f backend
```

---

### Option 2 — Development Mode (hot reload)

**Bước 1: Khởi động các DB và Ollama**
```bash
docker compose up -d qdrant weaviate milvus-standalone etcd minio ollama ollama-init
```

**Bước 2: Backend (Terminal 1)**
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt -r backend/requirements.txt

cd backend
uvicorn app.main:app --reload --port 8000
# → API chạy tại http://localhost:8000
# → Swagger UI tại http://localhost:8000/docs
```

**Bước 3: Frontend (Terminal 2)**
```bash
cd frontend
npm install
npm run dev
# → Dashboard tại http://localhost:5173
```

---

## Cấu Hình

### MOCK_MODE (chạy offline, không cần Ollama)

Chỉnh `src/config.py`:
```python
MOCK_MODE = True   # Dùng embedding giả + LLM response giả
```

Hoặc qua biến môi trường:
```bash
MOCK_MODE=true uvicorn app.main:app --reload --port 8000
```

### Tuỳ chỉnh quy mô Benchmark

Đặt trong `.env` hoặc shell trước khi chạy:
```bash
BENCH_CORPUS_SIZE=10000   # Số chunk synthetic (default 10K)
BENCH_NUM_QUERIES=200     # Số golden query (default 200)
BENCH_SEED=42             # Seed cố định — đảm bảo reproducibility
```

---

## Sử Dụng Dashboard

### Luồng Demo RAG (Video Demo)

1. Vào trang **RAG Chat** (`/rag-chat`).
2. Chọn Database trong sidebar trái (Qdrant / Weaviate / Milvus).
3. Kéo thả tệp PDF vào UploadPanel → bấm **Ingest**.
4. Gõ câu hỏi vào ô chat → xem câu trả lời + latency (ms).

### Các Trang Benchmark

| Trang | Route | Mục đích | Cách chạy |
| :- | :- | :- | :- |
| Overview | `/dashboard` | 3D VectorSpace + DB status + latency cards | Tự động |
| Latency | `/latency` | p95 latency insert/search + RAM/CPU container | Tự động sau khi có thao tác |
| Accuracy | `/accuracy` | Recall@1/5/10 + MRR leaderboard | Bấm **Run Accuracy Benchmark** |
| Recall vs Latency | `/tradeoff` | Pareto curve sweep `top_k ∈ {1,2,5,10,20,50}` | Bấm **Run Tradeoff Sweep** |
| Hybrid Search | `/hybrid` | So sánh Dense vs Hybrid cho B/C/D | Sau khi implement `search_hybrid()` |
| DX Score | `/dx-score` | SLOC + cyclomatic + imports radar chart | Bấm **Run DX Analyzer** |

---

## Fairness Protocol (Quan Trọng)

Tất cả 3 DB phải đọc HNSW params từ `src/config.py` — **không hardcode**:

```python
from src.config import INDEX_PARAMS
# INDEX_PARAMS = {"M": 16, "ef_construction": 128, "ef_search": 64, "metric": "COSINE"}
```

PR nào còn giá trị literal `M=16` hoặc `ef=64` sẽ bị reject bởi reviewer A.

---

## API Reference

Backend chạy tại `http://localhost:8000`. Swagger UI đầy đủ tại `/docs`.

| Endpoint | Method | Mô tả |
| :- | :- | :- |
| `/api/v1/health` | GET | Trạng thái kết nối 3 DB |
| `/api/v1/metrics` | GET | Dữ liệu `metrics.csv` dạng JSON |
| `/api/v1/ingest` | POST | Upload PDF → chunk → embed → insert |
| `/api/v1/chat` | POST | RAG query → answer + latency |
| `/api/v1/benchmark/accuracy` | POST | Recall@K + MRR evaluation |
| `/api/v1/benchmark/tradeoff` | POST | Recall vs Latency sweep |
| `/api/v1/benchmark/stress` | POST | Stress test tất cả DB |
| `/api/v1/resources` | GET | Docker container CPU/RAM |
| `/api/v1/dx` | GET | DX complexity score |

---

## Xử Lý Sự Cố

**Backend không kết nối được DB:**
```bash
# Kiểm tra container đang chạy
docker compose ps
# Xem log của DB cụ thể
docker compose logs qdrant
```

**Ollama chưa pull model xong:**
```bash
docker compose logs ollama-init
# Hoặc pull thủ công
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull qwen2.5:3b
```

**RAM không đủ (Milvus + Weaviate + Qdrant cùng lúc):**
- Tắt DB không dùng: `docker compose stop milvus-standalone etcd minio`
- Giảm `mem_limit` trong `docker-compose.yml`

**Frontend lỗi CORS:**
- Đảm bảo backend đang chạy ở port 8000
- Vite proxy `/api → http://localhost:8000` trong `frontend/vite.config.js`

---

*Dự án thuộc học phần Big Data — Seminar nghiên cứu khoa học.*
