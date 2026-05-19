# RAG Benchmark - Qdrant vs Weaviate vs Milvus

Hệ thống full-stack dùng để đánh giá và so sánh hiệu năng (benchmark) của ba vector database trong bài toán Retrieval-Augmented Generation (RAG): Qdrant, Weaviate và Milvus. Dự án bao gồm frontend React + Three.js, backend FastAPI và core Python benchmark logic được đóng gói bằng Docker Compose.

## 1. Kiến trúc hệ thống

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
Qdrant (:6333) | Weaviate (:8080) | Milvus (:19530)
  |
  + Ollama (:11434) - nomic-embed-text, qwen2.5:0.5b
```

Thư mục chính của dự án:
- frontend/: Giao diện React + Vite + Three.js để trực quan hóa không gian vector và biểu đồ metrics.
- backend/: FastAPI backend cung cấp các API điều phối benchmark, ingest và chat RAG.
- src/: Chứa mã nguồn core Python benchmark logic và kết nối database.
- docker-compose.yml: Cấu hình toàn bộ hệ thống để khởi chạy với duy nhất một câu lệnh.

## 2. Yêu cầu hệ thống

**Lưu ý quan trọng:** Hệ thống chỉ hỗ trợ chạy chính thức trên **Linux Native** và **WSL (Windows Subsystem for Linux)**. Môi trường Windows Native (PowerShell/CMD) và macOS không được hỗ trợ nhằm đảm bảo độ tương thích tối đa của Docker Network cùng các thư viện đo lường hệ thống.

- Docker: Phiên bản 24 trở lên.
- Docker Compose: Compose V2 plugin (lệnh `docker compose`).
- Tài nguyên: RAM tối thiểu 8 GB (khuyến nghị 12 GB), ổ đĩa còn trống ít nhất 25 GB để tải ảnh đĩa và model Ollama.

## 3. Hướng dẫn chạy nhanh bằng Docker Compose

Chạy lệnh sau tại thư mục gốc của dự án để khởi động tất cả các dịch vụ:

```bash
docker compose up -d
```

Sau khi các container đã khởi động xong, kiểm tra kết nối giữa backend và 3 vector database bằng cách truy cập endpoint:

```bash
curl http://localhost:8000/api/v1/health
```

Kết quả mong đợi khi các database kết nối bình thường:

```json
{"status":"ok","databases":{"Qdrant":true,"Weaviate":true,"Milvus":true}}
```

Địa chỉ truy cập các dịch vụ chính:
- React Dashboard: http://localhost:5173
- FastAPI Swagger Docs: http://localhost:8000/docs
- Qdrant Dashboard: http://localhost:6333/dashboard
- Weaviate REST: http://localhost:8080
- Milvus Port: localhost:19530

Để dừng và xóa toàn bộ dữ liệu khỏi các database:

```bash
docker compose down -v
```

## 4. Cấu hình cốt lõi (src/config.py)

Các thiết lập quan trọng để benchmark có thể được điều chỉnh trực tiếp trong file `src/config.py` hoặc override thông qua biến môi trường:

- MOCK_MODE: Đặt bằng `True` để dùng vector giả lập và bỏ qua việc gọi Ollama thật (phù hợp để test luồng nhanh). Đặt bằng `False` khi cần chạy thực tế với mô hình nhúng `nomic-embed-text` và mô hình ngôn ngữ `qwen2.5:0.5b`.
- INDEX_PARAMS: Cấu hình tham số index HNSW dùng chung cho cả 3 database để đảm bảo tính công bằng khi benchmark:
  - Metric: COSINE
  - Index Type: HNSW
  - M: 16
  - ef_construction: 128
  - ef_search: 64

## 5. Danh sách các endpoint chính phục vụ Demo

Backend FastAPI hỗ trợ đầy đủ các API phục vụ quá trình kiểm thử và thực nghiệm:
- GET `/api/v1/health`: Kiểm tra trạng thái kết nối các database.
- GET `/api/v1/metrics`: Lấy metrics độ trễ truy vấn live của hệ thống.
- GET `/api/v1/resources`: Lấy tài nguyên CPU/RAM của container đang chạy.
- POST `/api/v1/ingest`: Tải file PDF, thực hiện cắt chunk, nhúng vector và insert vào database.
- POST `/api/v1/chat`: Thực hiện câu hỏi đáp RAG trên database được chỉ định.
- GET `/api/v1/benchmark/accuracy/latest`: Lấy dữ liệu benchmark Recall@K và MRR gần nhất.
- GET `/api/v1/benchmark/tradeoff/latest`: Lấy dữ liệu biểu đồ tradeoff giữa độ trễ và độ chính xác.
- POST `/api/v1/benchmark/accuracy`: Khởi chạy một luồng kiểm thử độ chính xác mới trên database.
