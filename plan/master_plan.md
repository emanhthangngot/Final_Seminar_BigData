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
| **A** | Kịch bản Evaluator (Recall@K) & DX Score | Xây dựng UI Dashboard V2 (Tabs, Plots) | Gọi LLM Qwen tạo Golden Dataset |
| **B** | | Triển khai Weaviate `search_hybrid(Filters)`| Tối ưu từ khoá Hybrid search qua Alpha parameter |
| **C** | | Triển khai Milvus `search_hybrid(expr)` | Tối ưu Boolean Filter / AnnSearchRequest |
| **D** | | Triển khai Qdrant `search_hybrid(Prefetch)`| Tích hợp Payload Filter vào Dense Search |

### Giai đoạn 3 - Nâng cao: The Big Data Trio Benchmarking (Tuần 3)

| Thành viên | Accuracy & RAG Quality (Recall@K) | Hybrid Search & Metadata Filtering | DX (Developer Experience) Analytics |
| :--- | :--- | :--- | :--- |
| **A** | Đánh giá Tỷ lệ câu trả lời đúng (Recall@5) | Xây dựng Biểu đồ Line Chart cho Filtering | Tính điểm DX Matrix (SLOC, Code Complexity) |
| **B** | Phân tích Recall của Weaviate | Khảo sát Latency khi thêm filter phức tạp | Viết đánh giá trải nghiệm API của Weaviate |
| **C** | Phân tích Recall của Milvus | So sánh độ trễ Milvus Vector vs Hybrid | Viết đánh giá trải nghiệm cấu hình Schema Milvus |
| **D** | Phân tích Recall của Qdrant | Kiểm chứng tốc độ Prefetch của Qdrant | Viết đánh giá trải nghiệm Rust SDK Qdrant |

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

### Phần 1 - Hệ thống RAG Benchmarking V2 & Evaluator (Thành viên A)

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
- Dữ liệu `metrics.csv` phải bao gồm: `timestamp`, `database`, `operation`, `duration_ms`.
- Biểu đồ phải tương tác được: Cho phép lọc theo từng DB hoặc so sánh trực diện.

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
   `top_k ∈ {1, 2, 5, 10, 20, 50}`, xuất curve kiểu ann-benchmarks.com
   (điểm góc trên-trái = tốt nhất) — đây là chart quyết định trong slide.
5. **DX Score nâng cấp** — `dx_analyzer` giờ tính SLOC + cyclomatic complexity
   + public methods + 3rd-party imports → điểm tổng hợp thay vì chỉ đếm dòng.

### Bộ 4 Trụ Cột Đánh Giá (Final)

| Trụ cột | Metric | Module | Tab dashboard |
| :--- | :--- | :--- | :--- |
| **Latency & Resources** | `Duration_ms` (p50/p95), CPU%, RAM MB | `profiler.py`, `resource_monitor.py` | ⚡ Latency, System Resources |
| **Accuracy (RAG Quality)** | Recall@1/5/10, MRR | `evaluator.py`, `dataset.py` | 🎯 Accuracy |
| **Accuracy-Speed Tradeoff** | Recall vs AvgLatency curve | `tradeoff.py` | 📈 Recall vs Latency |
| **DX (Developer Experience)** | SLOC + cyclomatic + imports → score | `dx_analyzer.py` | 👨‍💻 DX Score |

---

## Quản lý Rủi ro & Giải pháp (Risk Management)

| Rủi ro | Mức độ | Giải pháp phòng ngừa |
| :--- | :--- | :--- |
| Tràn RAM khi chạy 3 DB | **Cao** | Thiết lập `mem_limit` trong Docker Compose, tắt DB không sử dụng. |
| Treo Ollama khi nạp hàng loạt | **Trung bình** | Implement cơ chế `backoff/retry` và nạp theo batch nhỏ (50 vectors). |
| Sai dimension vector (768) | **Nghiêm trọng** | Thêm hàm `assert len(vector) == 768` ngay sau bước embedding. |
| Mất dữ liệu khi DB Restart | **Trung bình** | Luôn khai báo `volumes` map ra folder đĩa host `./volumes/` trong Docker. |

---

## Quy tắc Branching và Commit chuyên nghiệp

- **Branching Rule:** `task/<phase>/<mem_id>/<feature_short>` (VD: `task/G2/memD/qdrant-ann`).
- **Review Policy:** Ít nhất 1 thành viên khác phải approve Pull Request trước khi merge.
- **Commit Format:** `[DB_NAME] Action: Description` (VD: `[MILVUS] Fix: Resolve collection load timeout`).

## Yêu cầu về code & Môi trường

- **Python Version:** 3.11 (Yêu cầu bắt buộc để đảm bảo tương thích thư viện).
- **Virtual Env:** Sử dụng `venv` hoặc `conda`. Không cài library global.

### Cấu trúc thư mục `src` (Cập nhật)

```text
src/
├── app/
│   └── main.py              # Streamlit UI & Dashboard V2 (6 tabs)
├── core/
│   ├── data_ingestion/
│   │   ├── processor.py     # Xử lý PDF & Chunking
│   │   ├── embedder.py      # Ollama Embedding + MOCK_MODE fallback
│   │   └── generator.py     # LLM generator + MOCK_MODE fallback
│   ├── db_clients/
│   │   ├── base.py          # Abstract BaseVectorDB
│   │   ├── qdrant.py        # Skeleton — Person D implements hybrid/reset
│   │   ├── weaviate.py      # Skeleton — Person B implements hybrid/reset
│   │   └── milvus.py        # Skeleton — Person C implements hybrid/reset
│   ├── benchmark/
│   │   ├── profiler.py      # @time_profiler decorator (append-mode CSV)
│   │   ├── resource_monitor.py  # Docker CPU/RAM stats per container
│   │   ├── stress_test.py   # Multi-round insert/search driver
│   │   ├── dataset.py       # Synthetic corpus + golden queries (CID-tagged)
│   │   ├── evaluator.py     # Recall@K + MRR on ground-truth IDs
│   │   └── tradeoff.py      # Recall vs Latency sweep (ann-benchmarks style)
│   └── utils/
│       ├── logger.py
│       ├── helpers.py
│       └── dx_analyzer.py   # SLOC + cyclomatic + imports → DX score
├── config.py                # Constants, ports, MOCK_MODE, INDEX_PARAMS, BENCH_*
└── volumes/                 # Data persistence for Docker containers
```

## Đảm bảo tính Reproducibility & Security

- **Fixed Seed:** Tuyệt đối không để độ ngẫu nhiên ảnh hưởng kết quả benchmark.
- **Config file:** Tách biệt `config.py` để không hardcode API endpoints.

## Tập dữ liệu thực nghiệm

Nhóm sử dụng **hai** nguồn dữ liệu bổ trợ lẫn nhau:

### Nguồn A — Synthetic Corpus (cho Benchmark chính thức)
- **Module:** `src/core/benchmark/dataset.py` (`build_corpus`, `build_golden_queries`)
- **Quy mô mặc định:** 10.000 chunks, 200 golden queries (override qua biến môi trường
  `BENCH_CORPUS_SIZE`, `BENCH_NUM_QUERIES`).
- **Đặc tính:** Deterministic (seed `BENCH_SEED=42`), mỗi chunk mang nhãn
  `[CID:NNNNNNN]` để làm ground truth cho Recall@K / MRR — **không cần LLM-as-judge**,
  không cần gán nhãn thủ công, hoàn toàn reproducible.
- **Lý do chọn:** Đây là dữ liệu chính cho tất cả biểu đồ trong slide — cùng corpus,
  cùng queries, cùng seed cho cả 3 DB ⇒ so sánh công bằng.

### Nguồn B — Real PDF Corpus (cho Demo RAG Chat)
- **Nguồn:** 10 tệp PDF báo cáo Seminar Big Data các năm trước.
- **Quy trình:** Upload → Validate → Extract (PyPDFLoader) → Chunk (RecursiveCharacterTextSplitter).
- **Lý do giữ lại:** Demo Q&A trực tiếp trên UI nhìn thuyết phục hơn synthetic text —
  dùng cho phần "Live RAG Agent" trong video demo, **không** dùng để báo cáo số
  Recall@K (vì không có ground truth đáng tin).
