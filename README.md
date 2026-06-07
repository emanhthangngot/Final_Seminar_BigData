# RAG Benchmark - Qdrant vs Weaviate vs Milvus

Hệ thống full-stack dùng để đánh giá và so sánh hiệu năng (benchmark) của ba vector database trong bài toán Retrieval-Augmented Generation (RAG): Qdrant, Weaviate và Milvus. Dự án bao gồm frontend React + Three.js, backend FastAPI và core Python benchmark logic được đóng gói bằng Docker Compose.

## 1. Yêu cầu hệ thống

* **Hệ điều hành:** Linux Native hoặc WSL (Windows Subsystem for Linux).
* **Công cụ:** Docker (v24+) và Docker Compose.
* **Tài nguyên khuyến nghị:** RAM >= 8 GB, dung lượng ổ đĩa trống >= 25 GB.

## 2. Hướng dẫn khởi chạy

Để khởi động toàn bộ các dịch vụ (Frontend, Backend, Databases, Ollama), thực hiện các bước sau tại thư mục gốc của dự án:

### Bước 1: Khởi động hệ thống
```bash
docker compose up -d
```

### Bước 2: Kiểm tra trạng thái kết nối
Đợi các container khởi động hoàn toàn, sau đó kiểm tra kết nối tới các vector database bằng lệnh:
```bash
curl http://localhost:8000/api/v1/health
```
Kết quả mong đợi:
```json
{"status":"ok","databases":{"Qdrant":true,"Weaviate":true,"Milvus":true}}
```

### Bước 3: Địa chỉ các dịch vụ
* **React Dashboard:** [http://localhost:5173](http://localhost:5173)
* **FastAPI Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Qdrant Dashboard:** [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### Bước 4: Dừng hệ thống
Để dừng toàn bộ dịch vụ và giải phóng bộ nhớ:
```bash
docker compose down -v
```
