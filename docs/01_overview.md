# PHẦN 1 — OVERVIEW: Vector Database trong Hệ sinh thái AI/LLM

**Seminar:** A Triple of Vectorstore — Qdrant, Weaviate, Milvus  
**Môn:** Nhập môn Khoa học Dữ liệu (Big Data)  
**Cập nhật:** 2026-05-20

---

## 1.1 Vector Database là gì? Tại sao cần trong thời đại LLM?

### Bài toán cốt lõi

Large Language Model (LLM) như GPT, Gemini, hay Qwen có khả năng sinh ngôn ngữ tự nhiên ấn tượng, nhưng tồn tại **3 giới hạn nghiêm trọng**:

| Giới hạn | Mô tả | Hậu quả |
|---|---|---|
| **Knowledge Cutoff** | LLM chỉ biết dữ liệu đến thời điểm huấn luyện | Không trả lời được câu hỏi về sự kiện mới |
| **Hallucination** | LLM "bịa" thông tin khi không có context | Câu trả lời tự tin nhưng sai hoàn toàn |
| **No Private Data** | LLM không thể truy cập dữ liệu nội bộ (tài liệu công ty, bài giảng riêng...) | Không dùng được cho ứng dụng chuyên biệt |

### Giải pháp: Retrieval-Augmented Generation (RAG)

RAG là kiến trúc giải quyết cả 3 giới hạn trên bằng cách **bổ sung bước retrieval trước khi sinh text**:

```
User Query → [Embedding Model] → Query Vector
                                      ↓
                            [Vector Database] ← Chứa toàn bộ tài liệu đã embedding
                                      ↓
                            Top-K Relevant Chunks
                                      ↓
                     [LLM] + Context → Generated Answer
```

**Vector Database** đóng vai trò **bộ nhớ ngữ nghĩa** (semantic memory) của hệ thống RAG:

1. **Indexing** — Tài liệu được chia nhỏ (chunk), chuyển thành vector embedding (mảng số ~768-1536 chiều), lưu vào database kèm metadata.
2. **Semantic Retrieval** — Khi user hỏi, câu hỏi cũng được embedding thành vector. Database tìm các chunk có vector gần nhất (cosine similarity, dot product...) — tức là gần nghĩa nhất.
3. **Context Augmentation** — Các chunk tìm được trở thành "context" cho LLM, giúp câu trả lời chính xác, có nguồn trích dẫn, giảm hallucination.

### Tại sao không dùng database truyền thống?

| Tiêu chí | SQL/NoSQL truyền thống | Vector Database |
|---|---|---|
| Tìm kiếm | Exact match (WHERE, LIKE) | Similarity search (ANN — Approximate Nearest Neighbor) |
| Dữ liệu | Structured rows/documents | High-dimensional vectors (768+ chiều) |
| Ý nghĩa | Tìm theo từ khóa chính xác | Tìm theo **ngữ nghĩa** — hiểu "ý" của câu hỏi |
| Ví dụ | "Tìm user có tên = 'Thành'" | "Tìm tài liệu nói về deep learning trong xử lý ảnh y tế" |

**Thuật toán cốt lõi**: Hầu hết vector database hiện đại đều sử dụng **HNSW (Hierarchical Navigable Small World)** — một thuật toán ANN dạng đồ thị đa tầng, cho phép tìm kiếm gần đúng với tốc độ cực nhanh (sub-10ms) trên tập dữ liệu hàng triệu vector.

---

## 1.2 Ba công cụ: Qdrant, Weaviate, Milvus

### Tóm tắt nhanh

| Tiêu chí | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| **Năm ra đời** | 2021 | 2019 | 2019 |
| **Ngôn ngữ core** | **Rust** | **Go** | **C++ & Go** |
| **Tổ chức** | Qdrant Solutions GmbH (Berlin, Đức) | Weaviate B.V. (Amsterdam, Hà Lan) | Zilliz Inc. + **LF AI & Data Foundation** (Linux Foundation) |
| **Triết lý** | Performance-first, Rust-native | AI-native, all-in-one platform | Distributed-first, enterprise scale |
| **Định vị** | "Hight-performance filtered vector search" | "The AI-native database for hybrid search" | "The world's most advanced open-source vector database" |

### Đặc điểm nổi bật (1 dòng mỗi tool)

- **Qdrant**: Viết bằng Rust → latency cực thấp, memory-safe; tích hợp metadata filter trực tiếp vào HNSW traversal (Filterable HNSW).
- **Weaviate**: Hybrid search native (BM25 + vector trong 1 API call); có module vectorizer/generative tích hợp sẵn.
- **Milvus**: Kiến trúc phân tán tách rời storage-compute; scale được tới hàng **tỷ vector**; hỗ trợ hybrid search qua Dense + Sparse Vector (SPLADE/BGE-M3), GPU acceleration và DiskANN.

---

## 1.3 Độ phổ biến & Vị trí trong cộng đồng

### GitHub Stars (Tháng 5/2026)

| Công cụ | GitHub Stars | Trend |
|---|---|---|
| **Milvus** (`milvus-io/milvus`) | ~44,400+ ⭐ | Dẫn đầu — cộng đồng enterprise lớn, backed by Linux Foundation |
| **Qdrant** (`qdrant/qdrant`) | ~31,400+ ⭐ | Tăng trưởng nhanh nhất — nổi lên mạnh từ 2023 nhờ wave RAG/agentic AI |
| **Weaviate** (`weaviate/weaviate`) | ~16,200+ ⭐ | Ổn định — tập trung vào DX và hybrid search |

### Nhận xét

- **Milvus** dẫn đầu GitHub stars chủ yếu nhờ lịch sử lâu đời (2019), backing từ Linux Foundation, và thị phần enterprise (Alibaba, eBay, Nvidia).
- **Qdrant** tăng trưởng nhanh nhất nhờ Rust performance appeal và xu hướng RAG/AI agent explosion từ 2023-2025.
- **Weaviate** có stars thấp nhất nhưng bù lại bằng developer experience tốt, module hệ sinh thái phong phú (vectorizer, generative), và hybrid search native.

> **Lưu ý**: GitHub stars không phản ánh chất lượng. Một dự án ít stars nhưng DX tốt, docs tốt có thể "dễ xài" hơn nhiều so với dự án nhiều stars nhưng phức tạp. Đây là một phần chúng tôi sẽ benchmark trong phần Evaluation.

### Vị trí trên bản đồ công nghệ

Cả 3 công cụ đều xuất hiện trong các bảng xếp hạng/so sánh uy tín:
- **DB-Engines Ranking** (category: Vector DBMS) — Milvus và Qdrant thường ở top 5.
- **Hacker News / Reddit** — Qdrant thường được đề cập nhiều nhất trong context "best for production RAG".
- **ANN Benchmarks** (ann-benchmarks.com) — Milvus (via Knowhere/Faiss) và Qdrant đều có entries cho HNSW.
- **Enterprise adoption**: Milvus → Alibaba Cloud, Shopee, eBay; Qdrant → dùng nhiều trong agentic AI startup; Weaviate → popular ở châu Âu và trong các prototype AI nhanh.

---

## 1.4 Trạng thái Mã nguồn mở (Open-Source)

Cả 3 công cụ đều là **open-source thực sự**, không phải "open-core" che giấu tính năng:

| Tiêu chí | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| **License** | **Apache 2.0** | **BSD 3-Clause** | **Apache 2.0** |
| **Loại license** | Permissive (cho phép thương mại, sửa đổi, phân phối) | Permissive (tương tự Apache 2.0, yêu cầu giữ copyright notice) | Permissive (cho phép thương mại, sửa đổi, phân phối) |
| **Tổ chức quản trị** | Qdrant Solutions GmbH | Weaviate B.V. | **LF AI & Data Foundation** (Linux Foundation) → graduated project |
| **Managed Cloud** | Qdrant Cloud (có free tier) | Weaviate Cloud (WCD) | Zilliz Cloud |
| **Self-hosted** | ✅ Docker, K8s, binary | ✅ Docker, K8s, Helm | ✅ Docker, K8s, Helm, Operator |

### Phân tích License

- **Apache 2.0** (Qdrant & Milvus): License phổ biến nhất trong OSS enterprise. Cho phép sử dụng thương mại tự do, bao gồm patent grant (bảo vệ người dùng khỏi kiện patent).
- **BSD 3-Clause** (Weaviate): Rất permissive, đơn giản hơn Apache 2.0. Yêu cầu duy nhất: giữ copyright notice trong code distribution. Không có patent grant rõ ràng như Apache 2.0.
- **Điểm chung**: Cả 3 license đều cho phép doanh nghiệp tự host, fork, modify mà không cần trả phí. Nguồn thu chính của các công ty là managed cloud service.

### Milvus: Graduated Project của Linux Foundation

Milvus có vị thế đặc biệt nhất trong 3 công cụ về mặt quản trị:
- Là **graduated project** của LF AI & Data Foundation (cùng cấp với các dự án như ONNX, Horovod).
- Điều này có nghĩa: governance độc lập, không bị chi phối bởi 1 công ty duy nhất, có Technical Steering Committee.
- So sánh: Qdrant và Weaviate vẫn do công ty sáng lập (GmbH/B.V.) điều hành chính, dù source code là open.

---

## 1.5 Tổng hợp cho Slide

### Slide gợi ý 1: "Why Vector Database?"
- Diagram: LLM → Knowledge Cutoff + Hallucination → RAG Architecture → Vector DB = Semantic Memory
- 1 câu: "Vector Database giải quyết vấn đề LLM không có bộ nhớ bằng cách lưu trữ và tìm kiếm ngữ nghĩa trên tập tài liệu."

### Slide gợi ý 2: "The Big Three"
- 3 logo (Qdrant / Weaviate / Milvus) + key stats
- Bảng: Ngôn ngữ | Stars | License | Năm ra đời | Positioning
- 1 câu: "Ba công cụ, ba triết lý khác nhau — Performance vs All-in-One vs Enterprise Scale."

### Slide gợi ý 3: "Open Source Landscape"
- Bảng license comparison
- Highlight Milvus = Linux Foundation graduated project
- 1 câu: "Cả 3 đều fully open-source, nhưng chỉ Milvus có governance độc lập từ Linux Foundation."

---

## Tham khảo

1. Lewis, P., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." — Paper gốc về RAG.
2. Malkov, Y. & Yashunin, D. (2018). "Efficient and Robust Approximate Nearest Neighbor using Hierarchical Navigable Small World Graphs." — Paper HNSW.
3. Qdrant Documentation — https://qdrant.tech/documentation/
4. Weaviate Documentation — https://weaviate.io/developers/weaviate
5. Milvus Documentation — https://milvus.io/docs
6. GitHub Repositories: `qdrant/qdrant`, `weaviate/weaviate`, `milvus-io/milvus`
7. DB-Engines Ranking (Vector DBMS) — https://db-engines.com/en/ranking/vector+dbms
