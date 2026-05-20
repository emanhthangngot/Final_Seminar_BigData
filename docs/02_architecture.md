# PHẦN 2 — KIẾN TRÚC TỔNG QUAN (Architecture Overview)

**Seminar:** A Triple of Vectorstore — Qdrant, Weaviate, Milvus  
**Môn:** Nhập môn Khoa học Dữ liệu (Big Data)  
**Cập nhật:** 2026-05-20

---

## 2.1 Qdrant — "Rust-Powered Performance Engine"

### Kiến trúc tổng quan

```
                        ┌─────────────────────────────────┐
                        │         Qdrant Server            │
                        │         (Single Binary)          │
                        ├─────────────────────────────────┤
                        │   REST API  │  gRPC API          │
                        ├─────────────────────────────────┤
                        │        Query Planner             │
                        │  (Adaptive Filter Strategy)      │
                        ├─────────┬───────────┬───────────┤
                        │Segment 1│ Segment 2 │ Segment N │
                        │┌───────┐│┌─────────┐│┌─────────┐│
                        ││ HNSW  │││ Payload ││| Vector  ││
                        ││ Index │││ Index   │││ Storage ││
                        │└───────┘│└─────────┘│└─────────┘│
                        ├─────────────────────────────────┤
                        │      Gridstore (KV Engine)       │
                        │         WAL (Write-Ahead Log)    │
                        └─────────────────────────────────┘
                              RAM / Memmap / On-Disk
```

### Thành phần chính

| Thành phần | Mô tả |
|---|---|
| **Rust Runtime** | Toàn bộ engine viết bằng Rust — memory-safe, zero-cost abstractions, không có GC pause |
| **Segment** | Đơn vị lưu trữ tự trị: mỗi segment chứa vector storage + payload storage + index riêng |
| **Gridstore** | Storage engine tự phát triển (thay thế RocksDB): gồm Tracker + Data Grid + Mask Layer + Gaps Layer, tối ưu cho truy xuất payload và sparse vector |
| **HNSW Index** | Custom implementation với Filterable HNSW — filter metadata trực tiếp trong quá trình duyệt đồ thị |
| **Payload Index** | Index cho metadata (keyword, integer, text, geo, datetime) — hỗ trợ on-disk storage |
| **WAL** | Write-Ahead Log đảm bảo durability — data được ghi WAL trước rồi mới commit |
| **Query Planner** | Tự động chọn chiến lược tối ưu theo filter cardinality |

### Thế mạnh độc bản: Filterable HNSW + ACORN

Đây là **điểm khác biệt quan trọng nhất** của Qdrant so với Weaviate và Milvus.

**Vấn đề chung của vector database khi kết hợp filter:**

| Chiến lược | Cách hoạt động | Nhược điểm |
|---|---|---|
| **Pre-filter** | Lọc metadata trước → search trên tập con | Nếu filter quá chặt, HNSW graph bị phân mảnh → recall giảm mạnh |
| **Post-filter** | Search vector trước → lọc kết quả sau | Nếu filter loại nhiều kết quả → thiếu candidates, phải search nhiều hơn |

**Cách Qdrant giải quyết: Filterable HNSW**

Qdrant **tích hợp filter trực tiếp vào quá trình duyệt HNSW graph**:
- Khi traverse từ node sang node, Qdrant kiểm tra payload filter **tại mỗi bước** thay vì trước/sau
- Graph connectivity được duy trì → recall không bị ảnh hưởng bởi filter
- Thuật toán **ACORN** (bản nâng cấp) tự động adaptive: chuyển giữa graph traversal và brute-force tuỳ filter selectivity

**Query Planner tự động chọn chiến lược:**
- **Filter matches nhiều points** → Filterable HNSW: duyệt graph, skip node không match
- **Filter matches ít points** → Bypass HNSW, dùng payload index trực tiếp (brute-force nhanh hơn)

**Tại sao Weaviate/Milvus không bằng ở điểm này?**
- Weaviate dùng allowlist (pre-filter) từ inverted index rồi mask lên HNSW — hiệu quả nhưng vẫn là 2 bước riêng biệt
- Milvus dùng `expr` pre-filter cũng hiệu quả, nhưng architecture multi-service khiến overhead cao hơn cho latency

### Quantization & Memory Optimization

| Kỹ thuật | Mô tả | Tiết kiệm RAM |
|---|---|---|
| **Scalar Quantization** | float32 → uint8 | ~4x |
| **Product Quantization (PQ)** | Chia vector thành sub-vectors, dùng centroids | 8-64x |
| **Binary Quantization** | Vector → binary bits | Lên đến 40x tốc độ cải thiện |
| **Asymmetric Quantization** | Stored vector dùng binary, query dùng scalar | Tối ưu cho disk-bound scenario |
| **Rescoring** | Oversampling trên quantized vectors → rescore bằng original vectors từ disk | Giữ recall cao dù quantize mạnh |

### Deployment Profile

```
Qdrant = 1 container duy nhất
RAM idle: ~79 MB (corpus 1K)
Không cần dependency ngoài (etcd, MinIO...)
```

---

## 2.2 Weaviate — "AI-Native All-in-One Platform"

### Kiến trúc tổng quan

```
              ┌────────────────────────────────────────────┐
              │              Weaviate Server                │
              │              (Go Runtime)                   │
              ├────────────────────────────────────────────┤
              │    REST API    │    GraphQL API              │
              ├────────────────────────────────────────────┤
              │              Module System                  │
              │  ┌──────────┐ ┌───────────┐ ┌────────────┐ │
              │  │text2vec- │ │generative-│ │ reranker-  │ │
              │  │transform.│ │openai     │ │ cohere     │ │
              │  └──────────┘ └───────────┘ └────────────┘ │
              ├────────────────────────────────────────────┤
              │              Query Engine                   │
              │     (Hybrid Fusion: Vector + BM25)          │
              ├──────────┬───────────┬─────────────────────┤
              │          │   Shard   │                      │
              │ ┌────────┤           ├────────────┐         │
              │ │Object  │  Vector   │ Inverted   │         │
              │ │Store   │  Index    │ Index      │         │
              │ │(LSM)   │  (HNSW)  │ (LSM+Bitmap│         │
              │ └────────┴──────────┴────────────┘         │
              ├────────────────────────────────────────────┤
              │         WAL (Write-Ahead Log)               │
              └────────────────────────────────────────────┘
```

### Thành phần chính

| Thành phần | Mô tả |
|---|---|
| **Go Runtime** | Viết bằng Go — concurrency model hiệu quả (goroutines), quản lý memory tự động |
| **Shard** | Đơn vị lưu trữ tự chứa: gồm 3 storage song song (Object + Vector + Inverted) |
| **Object Store (LSM-Tree)** | Lưu raw data objects + metadata, ghi memtable → flush thành immutable segments trên disk, dùng Bloom Filter để tối ưu read |
| **HNSW Vector Index** | Index vector riêng biệt, tách khỏi LSM để tránh phức tạp khi merge segments |
| **Inverted Index (LSM + Roaring Bitmap)** | Index cho BM25 keyword search và structured property filtering, dùng Roaring Bitmaps cho phép set operations nhanh |
| **Module System** | Plugin architecture cho vectorizer, generative, reranker — cắm vào lifecycle của DB |
| **WAL** | Write-Ahead Log cho durability: mọi write ghi WAL trước khi commit |

### Thế mạnh độc bản: Native Hybrid Search (BM25F + Vector Fusion)

Đây là **điểm khác biệt quan trọng nhất** của Weaviate — cũng là lý do nó được chọn nhiều cho RAG production.

**Vấn đề mà hybrid search giải quyết:**

| Loại search | Giỏi ở | Yếu ở |
|---|---|---|
| **Vector (semantic)** | Hiểu "ý" câu hỏi, tìm đồng nghĩa | Bỏ sót khi cần exact keyword (tên riêng, mã sản phẩm) |
| **BM25 (keyword)** | Exact match, tên riêng, technical terms | Không hiểu ngữ nghĩa, bỏ sót paraphrase |
| **Hybrid** | ✅ Kết hợp cả hai | Phức tạp hơn để implement |

**Cách Weaviate thực hiện hybrid search:**

```
User Query
    ├── [HNSW] → Vector Results (ranked by cosine similarity)
    │
    ├── [BM25F] → Keyword Results (ranked by term frequency × inverse doc freq)
    │
    └── [Fusion Algorithm] → Merged Ranked List
              ↓
        alpha = 0.0 → Pure BM25
        alpha = 0.5 → Balanced hybrid
        alpha = 1.0 → Pure vector
```

**BM25F** (không chỉ BM25 thông thường):
- Cho phép **field weighting**: trường "title" có trọng số cao hơn trường "content"
- Ví dụ: `title × 2.0 + abstract × 1.5 + body × 1.0`

**Fusion Algorithms:**
- **Relative Score Fusion** (default): Normalize scores rồi cộng weighted
- **Reciprocal Rank Fusion (RRF)**: Dùng rank position thay vì score — ổn định hơn khi score scale khác nhau

**Tại sao Qdrant/Milvus không bằng ở điểm này?**
- Qdrant hỗ trợ hybrid (dense + sparse vectors) nhưng cần setup riêng sparse vector, không có BM25 native
- Milvus có BM25 nhưng tích hợp sau (từ 2025), không tự nhiên như Weaviate vốn thiết kế hybrid từ đầu
- Weaviate chạy cả inverted index và HNSW **trong cùng query engine** → không cần stitch systems riêng lẻ

### Module System — "Plugin Everything"

| Module Type | Ví dụ | Chức năng |
|---|---|---|
| **Vectorizer** | `text2vec-transformers`, `text2vec-openai`, `multi2vec-clip` | Tự động embedding tại import/query time |
| **Generative** | `generative-openai`, `generative-cohere` | Tích hợp RAG: search → generate trong 1 query |
| **Reranker** | `reranker-cohere`, `reranker-transformers` | Re-rank results sau retrieval |

Ý nghĩa: Weaviate cho phép build full RAG pipeline **mà không cần code ngoài** — embedding, retrieval, generation đều xảy ra trong DB.

### Filtered Vector Search — Adaptive Strategy

1. Query có filter → Inverted Index sinh **allowlist** (Roaring Bitmap)
2. Nếu allowlist lớn → HNSW traversal dùng allowlist làm mask
3. Nếu allowlist nhỏ (filter chặt) → **Tự chuyển sang brute-force** trên tập filtered → nhanh và chính xác hơn traverse sparse graph

### Deployment Profile

```
Weaviate = 1 container chính
RAM idle: ~200-300 MB (tuỳ module loaded)
Không cần etcd/MinIO — standalone đơn giản
Multi-tenancy: per-tenant shard isolation
```

---

## 2.3 Milvus — "Distributed-First Enterprise Engine"

### Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                      Access Layer                            │
│                    ┌──────────┐                               │
│                    │  Proxy   │ (Stateless, load balance)     │
│                    └────┬─────┘                               │
├─────────────────────────┼───────────────────────────────────┤
│              Coordinator Service ("Brain")                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                   │
│  │RootCoord │  │DataCoord │  │QueryCoord │                   │
│  │(DDL/DCL) │  │(Segment  │  │(Load      │                   │
│  │          │  │ Alloc,   │  │ Balance,  │                   │
│  │          │  │ Flush,   │  │ Topology) │                   │
│  │          │  │ Compact) │  │           │                   │
│  └──────────┘  └──────────┘  └───────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                    Worker Nodes                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│  │Query Node │  │ Data Node │  │Index Node │                 │
│  │(Search,   │  │(Ingest,   │  │(Build     │                 │
│  │ Load      │  │ Persist   │  │ indexes   │                 │
│  │ Segments) │  │ binlogs)  │  │ offline)  │                 │
│  └───────────┘  └───────────┘  └───────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                              │
│  ┌──────┐  ┌────────────────┐  ┌────────────────────┐        │
│  │ etcd │  │ MinIO/S3       │  │ Message Queue      │        │
│  │(Meta)│  │(Vector Data,   │  │(WAL, Streaming     │        │
│  │      │  │ Index Files)   │  │ Ingestion)         │        │
│  └──────┘  └────────────────┘  └────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Thành phần chính

| Thành phần | Mô tả |
|---|---|
| **Proxy (Access Layer)** | Entry point stateless: validate request, route tới coordinator, aggregate results |
| **RootCoord** | Xử lý DDL (create/drop collection), quản lý timestamp (TSO) |
| **DataCoord** | Quản lý segment allocation, flush, compaction, garbage collection |
| **QueryCoord** | Phân phối segment cho Query Nodes, load balancing |
| **Query Node** | Thực thi search, load index vào RAM, phục vụ query |
| **Data Node** | Consume data từ message queue, persist thành binlogs ra object storage |
| **Index Node** | Build index offline trên sealed segments — tách riêng không ảnh hưởng query |
| **etcd** | Distributed KV store cho metadata, service discovery, health check |
| **MinIO/S3** | Object storage cho vector data files, scalar data, index files |
| **Message Queue** | WAL + streaming ingestion (Pulsar/Kafka, hoặc Woodpecker mới) |

### Thế mạnh độc bản: Disaggregated Architecture — Scale từng phần độc lập

Đây là **điểm khác biệt cốt lõi** của Milvus: **tách rời hoàn toàn compute và storage**.

**So sánh triết lý thiết kế:**

| Tiêu chí | Qdrant/Weaviate | Milvus |
|---|---|---|
| Mô hình | Monolithic (1 process làm hết) | Microservices (mỗi role 1 service) |
| Scale | Vertical (thêm RAM/CPU cho 1 node) | Horizontal (thêm node cho từng role) |
| Bottleneck | Nếu search chậm → phải scale cả cụm | Search chậm → chỉ thêm Query Node |
| Phù hợp | < 10M vectors, team nhỏ | > 100M vectors, enterprise |

**Ví dụ thực tế:**
- Search chậm? → Thêm Query Nodes (compute)
- Ingestion chậm? → Thêm Data Nodes
- Index build chậm? → Thêm Index Nodes
- Storage đầy? → Mở rộng MinIO/S3 cluster
- Không ảnh hưởng lẫn nhau!

### Knowhere — Vector Execution Engine

Knowhere là **engine thực thi vector search** nằm bên dưới Milvus, đóng vai trò abstraction layer:

```
                    Milvus Query Node
                          │
                     ┌────┴────┐
                     │Knowhere │
                     └────┬────┘
              ┌───────┬───┴───┬────────┐
              │ Faiss │HNSWlib│ ScaNN  │ DiskANN
              └───────┴───────┴────────┘
              CPU (SSE/AVX/AVX512) │ GPU (CUDA)
```

| Tính năng | Chi tiết |
|---|---|
| **Multi-library** | Wrap Faiss, HNSWlib, Annoy, ScaNN, DiskANN — chọn library tối ưu theo index type |
| **Hardware detection** | Tự chọn SIMD instruction set tốt nhất (SSE → AVX → AVX2 → AVX512) |
| **GPU acceleration** | Route index build/search lên GPU khi có CUDA |
| **Soft deletion** | Bitset mechanism: vector bị xoá được skip khi search, không cần rebuild index |

### Segcore — Data Segment Management

| Segment Type | Trạng thái | Đặc điểm |
|---|---|---|
| **Growing** | In-memory, đang nhận insert | Chưa build full index, dùng interim index hoặc brute-force |
| **Sealed** | Persisted ra MinIO | Full indexed (HNSW/IVF/DiskANN), immutable |

Lifecycle: `insert() → buffer in growing segment → flush() → sealed segment → build index → load() to Query Node`

### Collection Schema & Lifecycle

| So sánh | Milvus | Qdrant | Weaviate |
|---|---|---|---|
| Schema | **Bắt buộc khai báo trước** (FieldSchema) | Schema-free (payload tự do) | Auto-schema (tự suy kiểu) |
| Sau insert | `flush()` + `load()` **bắt buộc** | Sẵn sàng query ngay | Sẵn sàng query ngay |
| Trade-off | Tối ưu cho columnar storage, production governance | Flexible, nhanh prototype | Cân bằng |

### Chi phí thực đo (từ project benchmark)

| Bước | Thời gian | Ghi chú |
|---|---|---|
| `insert()` (1000 chunks, 2 batches) | ~2805 ms | Batch insert |
| `flush()` | ~2530 ms | **Bước đắt nhất** — persist buffer ra MinIO |
| `load()` | ~343 ms | Load HNSW index vào RAM |
| `search()` avg | ~6.88 ms | ANN query thuần |
| **Tổng khởi tạo** | **~5678 ms** | vs Qdrant: insert → ready ngay |

### Advanced Features

| Feature | Mô tả |
|---|---|
| **DiskANN** | Index trên SSD cho dataset vượt RAM — billion-scale với chi phí thấp |
| **Time Travel** | Query data tại 1 thời điểm trong quá khứ (hybrid timestamp) |
| **CDC (Change Data Capture)** | Đồng bộ incremental changes giữa các Milvus instances |
| **GPU Index** | Build index và search trên GPU — QPS cao hơn nhiều lần CPU |

### Deployment Profile

```
Milvus Standalone = 3 containers tối thiểu:
  - milvus-standalone (~398 MB RAM)
  - etcd (metadata)
  - minio (object storage)
Tổng RAM idle: ~398 MB / 2048 MB limit
So sánh: Qdrant chỉ dùng ~79 MB → Milvus ~5x RAM hơn
```

---

## 2.4 So sánh Kiến trúc — Bảng tổng hợp

### Bảng so sánh chính

| Tiêu chí | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| **Ngôn ngữ core** | Rust | Go | C++ (Knowhere) + Go (services) |
| **Mô hình kiến trúc** | Monolithic (1 binary) | Monolithic (1 binary) | Microservices (disaggregated) |
| **Storage engine** | Gridstore (custom KV) | LSM-Tree (custom) | MinIO/S3 (object storage) |
| **Vector index** | Custom HNSW (Filterable) | HNSW (separate from LSM) | Knowhere (Faiss/HNSWlib/DiskANN) |
| **Keyword search** | Sparse vectors + full-text filter | **BM25F native** (inverted index) | BM25 (tích hợp từ 2025) |
| **Filter strategy** | **Filterable HNSW + ACORN** (trong traversal) | Allowlist + adaptive brute-force | `expr` pre-filter (SQL-like) |
| **Schema** | Schema-free (payload) | Auto-schema | **Strict schema** (khai báo trước) |
| **Sau insert** | Ready ngay | Ready ngay | Cần `flush()` + `load()` |
| **Quantization** | Scalar, Product, Binary, Asymmetric | Binary, Product | Scalar, IVF-SQ8 |
| **Containers cần** | 1 | 1 | 3+ (etcd, MinIO) |
| **RAM idle** | ~79 MB | ~200-300 MB | ~398 MB |
| **GPU support** | HNSW indexing (Vulkan) | Không | **Build + Search (CUDA)** |
| **Scale model** | Vertical + sharding | Horizontal (shard + replica) | **Horizontal (per-role)** |
| **Best scale** | < 50M vectors | < 50M vectors | **> 100M → tỷ vectors** |

### "Tại sao X làm tốt ở Y mà 2 cái kia không bằng?"

| Công cụ | Thế mạnh độc bản | Lý do kiến trúc |
|---|---|---|
| **Qdrant** | **Filtered search nhanh nhất** — filter không giảm recall | Filterable HNSW tích hợp filter vào graph traversal, không cần pre/post-filter riêng. Rust cho zero-overhead abstraction. |
| **Weaviate** | **Hybrid search tự nhiên nhất** — BM25 + vector trong 1 call | Inverted index (BM25F) và HNSW index nằm cùng shard, cùng query engine. Không cần stitch external systems. |
| **Milvus** | **Scale lớn nhất** — tỷ vectors, scale từng thành phần | Disaggregated architecture: Query/Data/Index Node scale độc lập. Knowhere wrap nhiều library tối ưu. Object storage (MinIO/S3) không giới hạn dung lượng. |

---

## 2.5 Gợi ý cho Slide

### Slide "Architecture: Qdrant"
- Diagram 1-container đơn giản
- Highlight: Filterable HNSW — filter IN graph traversal
- Key stat: ~79 MB RAM, 1 container, ready after insert

### Slide "Architecture: Weaviate"
- Diagram 3-storage song song (Object + Vector + Inverted)
- Highlight: BM25F + Vector Fusion — alpha parameter
- Key stat: Module system cho vectorizer/generative

### Slide "Architecture: Milvus"
- Diagram 4-layer (Access → Coordinator → Worker → Storage)
- Highlight: Disaggregated — scale từng role
- Key stat: 3+ containers, ~398 MB RAM, flush+load lifecycle

### Slide "Head-to-Head Comparison"
- Bảng 2.4 rút gọn
- 3 câu trả lời "Tại sao X tốt hơn ở Y"
- Infographic: Qdrant=Speed, Weaviate=Hybrid, Milvus=Scale

---

## Tham khảo

1. Qdrant Architecture — https://qdrant.tech/documentation/concepts/
2. Qdrant Gridstore — https://qdrant.tech/articles/gridstore/
3. Qdrant Filterable HNSW — https://qdrant.tech/articles/filtrable-hnsw/
4. Weaviate Architecture — https://weaviate.io/developers/weaviate/concepts/storage
5. Weaviate Hybrid Search — https://weaviate.io/developers/weaviate/search/hybrid
6. Weaviate Modules — https://weaviate.io/developers/weaviate/modules
7. Milvus Architecture — https://milvus.io/docs/architecture_overview.md
8. Milvus Knowhere — https://milvus.io/docs/knowhere.md
9. Milvus DiskANN — https://milvus.io/docs/disk_index.md
10. Project benchmark data — `docs/milvus_analysis.md`, `src/core/benchmark/metrics.csv`
