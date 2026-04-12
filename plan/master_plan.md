# Kế hoạch Tổng thể (Master Plan) - RAG Benchmarking Project

- **Phạm vi:** So sánh hiệu năng (Benchmarking) 3 hệ quản trị Vector Database: **Qdrant**, **Weaviate**, và **Milvus** dựa trên kiến trúc Retrieval-Augmented Generation (RAG). Hệ thống phải xử lý được tệp PDF, thực hiện chunking, embedding và truy vấn context để LLM trả lời.
- **Không bao gồm:** Các dịch vụ Cloud trả phí (OpenAI, Pinecone), các mô hình LLM trực tuyến để đảm bảo tính an toàn dữ liệu, quyền riêng tư và chi phí vận hành 0đ.

## Danh sách thành viên

| Mã | Mã số sinh viên | Họ và tên | Vai trò chính | Kỹ năng bổ trợ |
| :--- | :--- | :--- | :--- | :--- |
| A | 23120099 | Lê Xuân Trí | RAG Architect & Frontend UI/UX | Python Streamlit, LangChain, CSS |
| B | 23120185 | Nguyễn Hồ Anh Tuấn | Weaviate Database Specialist | Docker, Golang Patterns, gRPC |
| C | 23120166 | Trần Hữu Kim Thành | Milvus Database Specialist | C++ Core Logic, etcd, Distributed Systems |
| D | 23120165 | Trần Lê Trung Trực | Qdrant Database Specialist | Rust Performance, Vector Algebra, API Design |

## Phân công chi tiết theo giai đoạn (Detailed Timeline)

### Giai đoạn 1 - Thiết lập Hạ tầng và Ingestion Pipeline (Tuần 1)

| Thành viên | Image Processing (Optional) | Database Setup & Configuration | Embedding & Logic Implementation |
| :--- | :--- | :--- | :--- |
| **A** | Nghiên cứu trích xuất bảng từ PDF | Khởi tạo repo GitHub & CI/CD cơ bản | Viết `processor.py`, tích hợp Ollama API (Embeddings) |
| **B** | | Container hóa Weaviate (port 8080) | Thiết lập Schema `RAGDocument` và kết nối gRPC |
| **C** | | Deploy Milvus Standalone (etcd/minio) | Tạo Collection, định nghĩa Field (dim=768) |
| **D** | | Cài đặt Qdrant với Volume Persistence | Khởi tạo Collection, cấu hình Distance Metric (Cosine) |

### Giai đoạn 2 - Phát triển CRUD và Tích hợp RAG (Tuần 2)

| Thành viên | UI/Orchestration Development | Data Insertion (Batching CRUD) | Search Strategy & ANN Optimization |
| :--- | :--- | :--- | :--- |
| **A** | Layout Streamlit (Tabs, Sidebar, Config) | Điều phối luồng dữ liệu từ PDF -> DB | Xây dựng Prompt Template, gọi LLM Qwen3.5 |
| **B** | | Triển khai `collection.batch.dynamic()` | Tối ưu truy vấn `nearVector` qua gRPC |
| **C** | | Viết logic `insert()` và `collection.flush()` | Cấu hình `HNSW` index (M=16, ef=64) |
| **D** | | Implement `client.upload_points()` | Tối ưu Payload filtering và `Cosine` search |

### Giai đoạn 3 - Benchmarking thực nghiệm & Stress Test (Tuần 3)

| Thành viên | Metrics Collection (Latency/Throughput) | System Monitoring (CPU/RAM/IO) | Analytics & Visualization |
| :--- | :--- | :--- | :--- |
| **A** | Đo tổng thời gian luồng RAG (End-to-End) | Tổng hợp dữ liệu thô vào `metrics.csv` | Phát triển Dashboard so sánh bằng Plotly/Altair |
| **B** | Đo `weaviate_ingest_ms` / 1000 vectors | Ghi nhận RAM usage của Weaviate (Go) | Phân tích hiệu quả của Batching |
| **C** | Đo `milvus_ingest_ms` / 1000 vectors | Monitor etcd/milvus-standalone resource | Phân tích RAM Spike khi gọi `load()` |
| **D** | Đo `qdrant_ingest_ms` / 1000 vectors | Kiểm chứng RAM cực thấp của Qdrant (Rust) | Phân tích độ ổn định của search latency |

### Giai đoạn 4 - Báo cáo, Đóng gói & Seminar (Tuần 4)

- **Cả nhóm:** Viết báo cáo học thuật (PDF) phân tích chi tiết:
  - Bổ sung **Sơ đồ kiến trúc tổng quan (Architecture Diagram)** cho từng CSDL.
  - Bổ sung thông tin đối chiếu về bản quyền (Open-source License), Bảng giá (Pricing), độ phổ biến (Community Stars) trong mảng Big Data.
  - Phân tích sâu ưu nhược điểm của 3 kiến trúc (Go vs C++ vs Rust) thông qua giải thích biểu đồ thực nghiệm.
- **A & B:** Thiết kế Slide thuyết trình tập trung vào tính tương phản (Trade-offs) và kết quả Benchmark.
- **C & D:** Quay video Live Demo mạch lạc, chỉ trình diễn tính năng chính. **Tuyệt đối không gộp bước cài đặt/config vào phần demo.**

---

## Đầu ra mong đợi (Detailed Deliverables)

### Phần 1 - Hệ thống RAG Core & UI (Thành viên A)

| Yêu cầu | Sản phẩm bàn giao cụ thể | Chỉ số đánh giá kỹ thuật |
| :--- | :--- | :--- |
| `processor.py` | Class xử lý PDF đa luồng, hỗ trợ Tiếng Việt | `chunks_count` > 0, `avg_len` ~ 1000 chars |
| `app.py` | Dashboard Streamlit hoàn chỉnh, mượt mà | Load time < 2s, Trạng thái DB luôn đồng nhất |
| Embedding | Vector 768 chiều ổn định, chuẩn hóa | `vector_dim=768`, 100% khớp model `nomic-embed-text` |

### Phần 2 - Vector Databases Benchmarking (Thành viên B, C, D)

| Database | Mục tiêu kỹ thuật tối thiểu | Chỉ số đo lường thực tế |
| :--- | :--- | :--- |
| **Weaviate** | Hoạt động qua gRPC, không lỗi Batch | `latency_ms` (mean/p95), `memory_usage_mb` |
| **Milvus** | Search thành công sau khi Load, Index Ready | `ingest_speed` (vectors/sec), `cpu_utilization` |
| **Qdrant** | Search với metadata filtering, RAM ổn định | `search_latency_ms`, `ram_at_idle_vs_peak` |

### Tiêu chí chung cho Benchmarking

- Sử dụng `@time_profiler` cho mọi phương thức `insert` và `search`.
- Dữ liệu `metrics.csv` phải bao gồm: `timestamp`, `database`, `operation`, `duration_ms`, `ram_usage_mb`.
- Biểu đồ phải tương tác được: Cho phép lọc theo từng DB hoặc so sánh trực diện.

---

## Quản lý Rủi ro & Giải pháp (Risk Management)

| Rủi ro | Mức độ | Giải pháp phòng ngừa |
| :--- | :--- | :--- |
| Tràn RAM khi chạy 3 DB | **Cao** | Thiết lập `mem_limit` trong Docker Compose, tắt DB không sử dụng. |
| Treo Ollama khi nạp hàng loạt | **Trung bình** | Implement cơ chế `backoff/retry` và nạp theo batch nhỏ (50 vectors). |
| Sai dimension vector (768) | **Nghiêm trọng** | Thêm hàm `assert len(vector) == 768` ngay sau bước embedding. |
| Mất dữ liệu khi DB Restart | **Trung bình** | Luôn khai báo `volumes` map ra folder đĩa host trong Docker. |

---

## Quy tắc Branching và Commit chuyên nghiệp

- **Branching Rule:** `task/<phase>/<mem_id>/<feature_short>` (VD: `task/G2/memD/qdrant-ann`).
- **Review Policy:** Ít nhất 1 thành viên khác phải approve Pull Request trước khi merge.
- **Commit Format:** `[DB_NAME] Action: Description` (VD: `[MILVUS] Fix: Resolve collection load timeout`).

## Yêu cầu về code & Môi trường

- **Python Version:** 3.11 (Yêu cầu bắt buộc để đảm bảo tương thích thư viện).
- **Virtual Env:** Sử dụng `venv` hoặc `conda`. Không cài library global.

### Cấu trúc thư mục `src` (Mở rộng)

```text
src/
├── app.py                 # Streamlit UI & Dashboard Logic
├── config.py              # Định nghĩa Constants, Ports, Model Names
├── data_ingestion/
│   ├── processor.py       # Xử lý PDF & Chunking
│   └── embedder.py        # Giao tiếp Ollama Embedding API
├── db_clients/
│   ├── base.py            # Abstract Base Class (ABC)
│   ├── qdrant.py          # Implement D
│   ├── weaviate.py        # Implement B
│   └── milvus.py          # Implement C
├── benchmark/
│   ├── profiler.py        # Decorator & Logging Utils
│   └── data/              # Folder chứa metrics.csv & raw history
└── utils/
    ├── logger.py          # Tập trung quản lý logs hệ thống
    └── helpers.py         # Các hàm xử lý chuỗi, định dạng số
```

## Đảm bảo tính Reproducibility & Security

- **Fixed Seed:** Tuyệt đối không để độ ngẫu nhiên ảnh hưởng kết quả benchmark.
- **Config file:** Tách biệt `config.py` để không hardcode API endpoints.

## Tập dữ liệu thực nghiệm

- **Nguồn:** 10 tệp PDF báo cáo Seminar Big Data các năm trước.
- **Quy trình:**
    1. Tải lên (Upload).
    2. Kiểm tra tính hợp lệ (Validate).
    3. Trích xuất text (Extract).
    4. Gán ID nhãn (Labeling) để phục vụ đo lường độ chính xác retrieval.
