# RAG Benchmark - Qdrant vs Weaviate vs Milvus

Hệ thống full-stack dùng để benchmark 3 vector database trong bài toán Retrieval-Augmented Generation (RAG):

- **Qdrant**: vector database viết bằng Rust, mạnh về latency thấp và payload filtering.
- **Weaviate**: vector database viết bằng Go, hỗ trợ hybrid search native BM25 + vector.
- **Milvus**: vector database kiến trúc phân tán, dùng C++ core, có HNSW index và expr filter.

Dự án gồm frontend React + Three.js, backend FastAPI, core Python benchmark logic và toàn bộ hạ tầng chạy local bằng Docker Compose.

## 1. Mục tiêu dự án

Dự án không chỉ kiểm tra 3 database bằng script đơn giản, mà xây một hệ thống có thể:

1. Nhận hoặc sinh dữ liệu benchmark.
2. Chia tài liệu thành chunk.
3. Sinh embedding vector 768 chiều.
4. Insert dữ liệu vào Qdrant, Weaviate, Milvus.
5. Search bằng dense vector hoặc hybrid/filter search.
6. Đo latency, recall, MRR, tradeoff giữa tốc độ và độ chính xác.
7. Hiển thị kết quả bằng dashboard web.

## 2. Thành viên và vai trò

| Mã | Họ và tên | Vai trò |
| :- | :- | :- |
| A | Lê Xuân Trí | RAG Architect & Full-Stack Lead |
| B | Nguyễn Hồ Anh Tuấn | Weaviate Specialist |
| C | Trần Hữu Kim Thành | Milvus Specialist |
| D | Trần Lê Trung Trực | Qdrant Specialist |

## 3. Kiến trúc hệ thống

```text
Browser
  |
  | HTTP /api/v1/*
  v
React + Three.js Frontend (:5173)
  |
  | REST API
  v
FastAPI Backend (:8000)
  |
  | Python SDK / shared core logic
  v
Qdrant (:6333) | Weaviate (:8080/:50051) | Milvus (:19530)
  |
  + Ollama (:11434) - nomic-embed-text, qwen2.5:3b
```

Thư mục chính:

```text
.
├── frontend/                 React + Vite + Three.js
├── backend/                  FastAPI backend
├── src/
│   ├── config.py             Cấu hình chung, INDEX_PARAMS, MOCK_MODE
│   └── core/
│       ├── db_clients/       Qdrant, Weaviate, Milvus wrappers
│       ├── benchmark/        Dataset, evaluator, tradeoff, profiler
│       ├── data_ingestion/   Processor, embedder, generator
│       └── utils/            Logger, helper, DX analyzer
├── docker-compose.yml        Chạy toàn bộ services
├── requirements.txt          Dependency Python core/backend dùng chung
└── backend/requirements.txt  Dependency riêng cho backend
```

## 4. Công nghệ sử dụng

### Frontend

- React 18
- Vite
- Three.js
- `@react-three/fiber`
- Recharts
- Zustand
- Tailwind CSS

### Backend

- FastAPI
- Uvicorn
- Pydantic
- Python 3.11 trong Docker image

### Core và benchmark

- Qdrant Python client
- Weaviate Python client
- PyMilvus
- pandas
- Docker SDK
- psutil
- radon

### Infrastructure

- Docker Compose V2
- Qdrant
- Weaviate
- Milvus Standalone
- etcd
- MinIO
- Ollama

## 5. Yêu cầu hệ thống

| Thành phần | Yêu cầu |
| :- | :- |
| Docker | Docker 24+ |
| Docker Compose | Compose V2 plugin (`docker compose`) hoặc standalone binary tương thích |
| RAM | Tối thiểu 8 GB, khuyến nghị 12 GB nếu chạy đủ 3 DB + Ollama |
| Disk trống | Khuyến nghị còn ít nhất 25 GB cho lần chạy đầu vì cần pull Milvus, Ollama image và model Ollama |
| Python local | 3.11 nếu chạy development mode ngoài Docker |
| Node.js local | 20 LTS nếu chạy frontend development mode |

Lưu ý: nếu chỉ chạy bằng Docker Compose thì backend sẽ tự tạo virtual environment trong container.

## 6. Cách chạy mới bằng Docker Compose

Đây là cách chạy khuyến nghị cho toàn bộ dự án.

### 6.1. Chạy toàn bộ hệ thống

Từ thư mục root của dự án:

```bash
docker compose up -d
```

Nếu máy chỉ có Docker Engine nhưng thiếu Compose V2 plugin, kiểm tra nhanh:

```bash
docker compose version
```

Trong trường hợp cần dùng standalone binary tạm thời, tải binary phù hợp từ Docker Compose release, cấp quyền execute rồi chạy thay cho `docker compose`. Ví dụ Linux x86_64:

```bash
curl -L https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64 -o /tmp/docker-compose
chmod +x /tmp/docker-compose
/tmp/docker-compose up -d
```

Nếu lệnh Docker bị treo khi kết nối Docker Desktop context, kiểm tra context hiện tại:

```bash
docker context ls
```

Trên máy Linux có Docker daemon hệ thống đang chạy, có thể chuyển sang context `default`:

```bash
docker context use default
```

Lệnh này sẽ chạy:

- Qdrant
- Weaviate
- Milvus Standalone
- etcd
- MinIO
- Ollama
- Ollama init service để pull model
- FastAPI backend
- React frontend

### 6.2. Backend tự tạo venv và pip install

Trong `docker-compose.yml`, service `backend` hiện đã được cấu hình để tự tạo virtual environment khi container start:

```yaml
environment:
  - PYTHONPATH=/app:/app/backend
command: >
  sh -c "
    python -m venv /opt/venv &&
    . /opt/venv/bin/activate &&
    python -m pip install --upgrade pip &&
    pip install --no-cache-dir -r /app/requirements.txt -r /app/backend/requirements.txt &&
    exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
  "
```

Ý nghĩa:

1. Tạo venv trong container tại `/opt/venv`.
2. Activate venv.
3. Upgrade `pip`.
4. Cài dependency từ:
   - `/app/requirements.txt`
   - `/app/backend/requirements.txt`
5. Dùng `PYTHONPATH=/app:/app/backend` để import được cả `backend.app...` và `app...`.
6. Chạy backend bằng `uvicorn`.

Vì vậy khi chạy Docker Compose, không cần tự activate venv hoặc pip install thủ công cho backend.

### 6.3. Kiểm tra container

```bash
docker compose ps
```

Các service chính cần ở trạng thái `Up`:

- `seminar_qdrant`
- `seminar_weaviate`
- `seminar_milvus`
- `seminar_milvus_etcd`
- `seminar_milvus_minio`
- `seminar_ollama`
- `seminar_backend`
- `seminar_frontend`

### 6.4. Truy cập hệ thống

| Service | URL |
| :- | :- |
| React Dashboard | http://localhost:5173 |
| FastAPI Swagger Docs | http://localhost:8000/docs |
| Backend Health | http://localhost:8000/api/v1/health |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| Weaviate REST | http://localhost:8080 |
| Milvus | localhost:19530 |
| MinIO Console | http://localhost:9001 |

### 6.5. Xem log

Backend:

```bash
docker compose logs -f backend
```

Ollama init:

```bash
docker compose logs -f ollama-init
```

Database cụ thể:

```bash
docker compose logs -f qdrant
docker compose logs -f weaviate
docker compose logs -f milvus-standalone
```

### 6.6. Smoke test nhanh

Sau khi các container đã `Up`, kiểm tra backend kết nối đủ 3 database:

```bash
curl http://localhost:8000/api/v1/health
```

Kết quả mong đợi:

```json
{"status":"ok","databases":{"Qdrant":true,"Weaviate":true,"Milvus":true}}
```

Kiểm tra dữ liệu benchmark snapshot dùng cho frontend:

```bash
curl http://localhost:8000/api/v1/benchmark/accuracy/latest
curl http://localhost:8000/api/v1/benchmark/tradeoff/latest
curl http://localhost:8000/api/v1/metrics
```

### 6.7. Rebuild khi dependency hoặc Dockerfile thay đổi

```bash
docker compose up -d --build
```

Nếu muốn recreate backend riêng:

```bash
docker compose up -d --build backend
```

## 7. Chạy từng nhóm service

### 7.1. Chỉ chạy database và Ollama

Dùng khi muốn chạy backend/frontend ở local development mode:

```bash
docker compose up -d qdrant weaviate etcd minio milvus-standalone ollama ollama-init
```

### 7.2. Chỉ restart backend

```bash
docker compose restart backend
```

### 7.3. Dừng toàn bộ

```bash
docker compose down
```

### 7.4. Dừng và xóa volumes dữ liệu

Chỉ dùng khi muốn reset sạch dữ liệu DB local:

```bash
docker compose down -v
```

Lưu ý: command này xóa Docker volumes managed bởi Docker. Dự án cũng bind mount dữ liệu vào `./volumes/`, nên nếu muốn xóa sạch hoàn toàn dữ liệu local cần kiểm tra thêm thư mục đó.

## 8. Development mode không dùng backend container

Nếu muốn chạy backend ngoài Docker để debug code Python trực tiếp:

### 8.1. Chạy database trước

```bash
docker compose up -d qdrant weaviate etcd minio milvus-standalone ollama ollama-init
```

### 8.2. Tạo venv local

```bash
python3.11 -m venv venv
source venv/bin/activate
```

Windows:

```powershell
py -3.11 -m venv venv
venv\Scripts\activate
```

### 8.3. Cài dependency

```bash
pip install --upgrade pip
pip install -r requirements.txt -r backend/requirements.txt
```

### 8.4. Chạy backend local

Từ root project:

```bash
PYTHONPATH=.:backend uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Hoặc:

```bash
cd backend
PYTHONPATH=.:.. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 8.5. Chạy frontend local

```bash
cd frontend
npm install
npm run dev
```

Frontend development server chạy tại:

```text
http://localhost:5173
```

## 9. Cấu hình quan trọng

### 9.1. MOCK_MODE

`MOCK_MODE` nằm trong `src/config.py`.

Khi `MOCK_MODE=True`:

- Không cần gọi Ollama thật để sinh embedding.
- Embedder trả vector giả lập deterministic 768 chiều.
- Phù hợp để test pipeline và UI nhanh.

Khi `MOCK_MODE=False`:

- Hệ thống gọi Ollama thật.
- Cần đảm bảo model `nomic-embed-text` đã được pull.

Có thể cấu hình qua biến môi trường:

```bash
MOCK_MODE=true docker compose up -d
```

Hoặc khi chạy local:

```bash
MOCK_MODE=true PYTHONPATH=.:backend uvicorn backend.app.main:app --reload --port 8000
```

### 9.2. Benchmark scale

Các biến trong `src/config.py`:

```python
BENCH_CORPUS_SIZE = 10000
BENCH_NUM_QUERIES = 200
BENCH_SEED = 42
```

Có thể override qua environment:

```bash
BENCH_CORPUS_SIZE=1000 BENCH_NUM_QUERIES=50 docker compose up -d
```

### 9.3. Fairness Protocol

Tất cả DB wrapper phải dùng chung HNSW params từ `src/config.py`:

```python
INDEX_PARAMS = {
    "metric": "COSINE",
    "index_type": "HNSW",
    "M": 16,
    "ef_construction": 128,
    "ef_search": 64,
}
```

Mapping hiện tại:

- Qdrant: `models.HnswConfigDiff(...)`, `models.SearchParams(...)`.
- Weaviate: `Configure.VectorIndex.hnsw(...)`.
- Milvus: `index_params` với `index_type="HNSW"`.

Không chỉnh riêng HNSW params trong từng wrapper nếu mục tiêu là benchmark công bằng.

## 10. Cách sử dụng dashboard

Sau khi chạy:

```bash
docker compose up -d
```

Mở:

```text
http://localhost:5173
```

Các trang chính:

| Trang | Route | Mục đích |
| :- | :- | :- |
| Dashboard | `/dashboard` | Tổng quan trạng thái DB và biểu đồ |
| Latency | `/latency` | Xem latency insert/search |
| Accuracy | `/accuracy` | Chạy Recall@K/MRR benchmark |
| Tradeoff | `/tradeoff` | Xem Recall vs Latency |
| Hybrid | `/hybrid` | So sánh filter/hybrid search |
| DX Score | `/dx-score` | Phân tích developer experience |
| RAG Chat | `/rag-chat` | Upload tài liệu và hỏi đáp |

Luồng demo RAG:

1. Vào `/rag-chat`.
2. Chọn database: Qdrant, Weaviate hoặc Milvus.
3. Upload PDF.
4. Chạy ingest.
5. Nhập câu hỏi.
6. Xem câu trả lời và latency.

## 11. API backend

Swagger:

```text
http://localhost:8000/docs
```

Một số endpoint chính:

| Endpoint | Method | Mục đích |
| :- | :- | :- |
| `/api/v1/health` | GET | Kiểm tra DB nào đã kết nối |
| `/api/v1/metrics` | GET | Lấy metrics latency |
| `/api/v1/resources` | GET | Lấy CPU/RAM container |
| `/api/v1/ingest` | POST | Upload/chunk/embed/insert |
| `/api/v1/chat` | POST | RAG query |
| `/api/v1/benchmark/accuracy/latest` | GET | Lấy snapshot Recall@K/MRR từ dữ liệu benchmark thật |
| `/api/v1/benchmark/tradeoff/latest` | GET | Lấy snapshot Recall vs Latency từ dữ liệu benchmark thật |
| `/api/v1/benchmark/accuracy` | POST | Recall@K/MRR |
| `/api/v1/benchmark/tradeoff` | POST | Recall vs Latency sweep |
| `/api/v1/benchmark/stress` | POST | Stress test |
| `/api/v1/dx` | GET | DX score |

Kiểm tra nhanh health:

```bash
curl http://localhost:8000/api/v1/health
```

## 12. Chạy test/integration test

Nên chạy test trong venv local hoặc trong backend container đã có dependency.

### 12.1. Chạy bằng venv local

```bash
source venv/bin/activate
```

Milvus:

```bash
python -m src.core.db_clients.test_milvus_connection
python -m src.core.db_clients.test_milvus_phase2
```

Qdrant:

```bash
python -m src.core.db_clients.test_qdrant_pr_review
python -m src.core.db_clients.test_qdrant_connection
python -m src.core.db_clients.test_qdrant_phase2
```

### 12.2. Chạy trong backend container

```bash
docker compose exec backend sh
. /opt/venv/bin/activate
python -m src.core.db_clients.test_milvus_connection
python -m src.core.db_clients.test_qdrant_connection
```

### 12.3. Lưu ý khi chạy test

Không chạy đồng thời nhiều test cùng reset một collection, ví dụ `test_qdrant_phase2` và một smoke test Qdrant khác cùng lúc. Các test này có thể gọi `reset_collection()` và làm nhiễu nhau.

## 13. Logic benchmark hiện tại

### 13.1. Dataset synthetic

`src/core/benchmark/dataset.py` sinh corpus có tag:

```text
[CID:...]
```

Evaluator dùng CID để xác định search có trả đúng chunk gốc không.

### 13.2. Accuracy benchmark

`src/core/benchmark/evaluator.py` tính:

- Recall@1
- Recall@5
- Recall@10
- MRR
- Average latency
- Errors

### 13.3. Tradeoff benchmark

`src/core/benchmark/tradeoff.py` sweep nhiều giá trị `top_k`:

```text
1, 2, 5, 10, 20, 50
```

Kết quả dùng để vẽ đường Recall vs Average Latency.

### 13.4. Profiler

`@time_profiler` đo thời gian cho:

- `insert()`
- `search()`
- `search_hybrid()`

## 14. Xử lý sự cố

### 14.1. Backend mất nhiều thời gian khi start

Do backend container tạo venv và pip install dependency ở runtime. Lần đầu có thể mất vài phút.

Kiểm tra log:

```bash
docker compose logs -f backend
```

### 14.2. Docker Compose bị treo khi chạy

Kiểm tra Docker context:

```bash
docker context ls
```

Nếu context hiện tại là `desktop-linux` và lệnh bị treo khi kết nối Docker Desktop socket, thử dùng Docker daemon hệ thống:

```bash
docker context use default
docker compose ps
```

Hoặc chạy tạm bằng context cụ thể:

```bash
docker --context default compose up -d
```

### 14.3. Backend không kết nối được DB

Kiểm tra container:

```bash
docker compose ps
```

Xem log DB:

```bash
docker compose logs qdrant
docker compose logs weaviate
docker compose logs milvus-standalone
```

### 14.4. Ollama chưa có model

Xem log:

```bash
docker compose logs -f ollama-init
```

Pull thủ công:

```bash
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull qwen2.5:3b
```

### 14.5. Hết dung lượng disk khi pull image/model hoặc Qdrant ghi WAL

Triệu chứng:

```text
No space left on device: WAL buffer size exceeds available disk space
failed to extract layer ... no space left on device
```

Kiểm tra disk:

```bash
df -h .
docker system df
```

Nếu dùng Docker Desktop cũ trên cùng máy nhưng Docker daemon hiện tại là `/var/lib/docker`, kiểm tra thêm dữ liệu Docker Desktop còn sót:

```bash
du -h -d 2 ~/.docker/desktop 2>/dev/null | sort -h | tail
docker info --format 'DockerRootDir={{.DockerRootDir}}'
```

Chỉ xóa file Docker Desktop VM disk khi chắc chắn nó không phải Docker daemon đang dùng. Việc xóa file này sẽ làm mất image/volume của Docker Desktop:

```bash
rm -f ~/.docker/desktop/vms/0/data/Docker.raw
```

Dọn Docker build cache:

```bash
docker builder prune -f
```

### 14.6. Xóa cache Docker khi cần dọn dung lượng

Trước khi xóa cache, nên kiểm tra Docker đang dùng bao nhiêu dung lượng:

```bash
docker system df
```

Xóa build cache không dùng. Đây là lựa chọn nên dùng trước vì thường an toàn nhất, không xóa container/volume đang chạy:

```bash
docker builder prune -f
```

Xóa toàn bộ build cache, kể cả cache ít dùng gần đây:

```bash
docker builder prune -a -f
```

Xóa container đã stop, network không dùng, dangling image và build cache không dùng:

```bash
docker system prune -f
```

Xóa mạnh hơn: bao gồm cả image không còn được container nào dùng:

```bash
docker system prune -a -f
```

Nếu muốn xóa cả Docker volumes không dùng:

```bash
docker system prune -a --volumes -f
```

Cảnh báo: lệnh có `--volumes` có thể xóa dữ liệu database nếu dữ liệu đang nằm trong Docker-managed volumes không còn được container sử dụng. Dự án hiện bind mount dữ liệu vào thư mục `./volumes/`, nên các lệnh prune Docker thường không xóa trực tiếp thư mục này. Nếu muốn xóa sạch dữ liệu local của dự án, cần tự kiểm tra và xóa thư mục `./volumes/` một cách có chủ đích.

### 14.7. RAM không đủ

Nếu máy yếu, có thể chỉ chạy DB cần test.

Ví dụ chỉ chạy Qdrant:

```bash
docker compose up -d qdrant backend frontend
```

Ví dụ tắt Milvus:

```bash
docker compose stop milvus-standalone etcd minio
```

### 14.8. Frontend không gọi được backend

Kiểm tra backend:

```bash
curl http://localhost:8000/api/v1/health
```

Kiểm tra frontend proxy trong:

```text
frontend/vite.config.js
```

## 15. Trạng thái hiện tại

Đến hiện tại:

- Stage 1 đã hoàn thành setup hạ tầng và wrapper cơ bản cho 3 DB.
- Stage 2 đã hoàn thành hybrid/filter/reset/validation cho 3 DB.
- PR Weaviate Stage 2 đã merge.
- PR Milvus Stage 2 đã merge.
- PR Qdrant Stage 2 đã merge.
- `main` hiện đã chứa đầy đủ 3 wrapper DB sẵn sàng cho benchmark.

Merge commit mới nhất sau Stage 2:

```text
a713e65cba68d25d1471b929c133921a3c978572
```

## 16. Ghi chú quan trọng

- Plan yêu cầu Python 3.11. Docker backend dùng image `python:3.11-slim`.
- Nếu chạy local, nên dùng `python3.11`.
- Backend trong Docker Compose tự tạo venv tại `/opt/venv`.
- Không cần tự chạy `source venv/bin/activate` nếu dùng Docker Compose full mode.
- Khi benchmark nghiêm túc, nên đặt `MOCK_MODE=False` và đảm bảo Ollama model đã sẵn sàng.

---

Dự án thuộc học phần Big Data - Seminar nghiên cứu và benchmark hệ quản trị vector database trong kiến trúc RAG.
