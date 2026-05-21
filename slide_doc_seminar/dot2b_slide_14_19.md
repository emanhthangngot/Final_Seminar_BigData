# ĐỢT 2B — SLIDE 14–19: MILVUS + COMPARISON + QUANTIZATION

---

## SLIDE 14 — Milvus: Distributed-First Engine

**Thời gian:** 1.5 phút · **Speaker:** C

### Mục đích
Giới thiệu kiến trúc 4-layer microservices của Milvus. Trả lời: "Tại sao Milvus cần nhiều thành phần hơn?"

### Nội dung hiển thị

**Diagram 4-layer:**

```
┌──────────────────────────────────────────┐
│  ACCESS LAYER     [Proxy — Stateless]    │
├──────────────────────────────────────────┤
│  COORDINATOR      "Brain"                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │RootCoord │ │DataCoord │ │QueryCoord│ │
│  │(DDL/DCL) │ │(Segment, │ │(Load     │ │
│  │          │ │ Flush)   │ │ Balance) │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────┤
│  WORKER NODES                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Query Node│ │Data Node │ │Index Node│ │
│  │(Search)  │ │(Ingest)  │ │(Build)   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────┤
│  STORAGE LAYER                           │
│  [etcd] · [MinIO/S3] · [Message Queue]   │
└──────────────────────────────────────────┘
```

**Key Stats (sidebar):**

| Metric | Giá trị |
|--------|---------|
| Containers | **3+ (etcd, MinIO)** |
| RAM idle | **~398 MB** |
| Ngôn ngữ | **C++ (Knowhere) + Go** |
| Mô hình | **Microservices** |

### Speaker Notes
> "Milvus có kiến trúc hoàn toàn khác Qdrant và Weaviate — đây là hệ thống **microservices 4 tầng**. Access Layer nhận request, Coordinator đóng vai trò bộ não điều phối, Worker Nodes thực thi tính toán, và Storage Layer dùng etcd cho metadata, MinIO cho object storage.
>
> Ngay cả chế độ Standalone cũng kéo theo 3 container — đó là trade-off cho khả năng scale mà chúng ta sẽ thấy ở slide sau."

---

## SLIDE 15 — Milvus: Disaggregated & Knowhere

**Thời gian:** 1.5 phút · **Speaker:** C

### Mục đích
Trình bày **thế mạnh độc bản**: tách rời Storage/Compute và engine Knowhere.

### Nội dung hiển thị

**Phần trên — So sánh triết lý:**

| | Qdrant / Weaviate | Milvus |
|---|---|---|
| Mô hình | Monolithic (1 process) | Microservices (mỗi role 1 service) |
| Scale | Vertical (thêm RAM/CPU) | **Horizontal (thêm node từng role)** |
| Bottleneck | Search chậm → scale cả cụm | Search chậm → **chỉ thêm Query Node** |

**Phần dưới — Knowhere Engine:**

```
        Milvus Query Node
              │
         ┌────┴────┐
         │Knowhere  │  ← Abstraction Layer
         └────┬────┘
    ┌─────┬───┴───┬────────┐
    │Faiss│HNSWlib│ ScaNN  │ DiskANN
    └─────┴───────┴────────┘
    CPU (SSE/AVX/AVX512) │ GPU (CUDA)
```

- Multi-library: tự chọn library tối ưu theo index type
- Hardware detection: tự chọn SIMD instruction set tốt nhất
- GPU acceleration: route build/search lên CUDA khi có

### Speaker Notes
> "Thế mạnh cốt lõi của Milvus: **tách rời hoàn toàn compute và storage**. Search chậm? Chỉ cần thêm Query Node. Ingestion chậm? Thêm Data Node. Không ảnh hưởng lẫn nhau.
>
> Bên dưới là **Knowhere** — engine thực thi vector search, đóng vai trò abstraction layer. Nó wrap nhiều thư viện: Faiss, HNSWlib, ScaNN, DiskANN — tự động chọn library và SIMD instruction set tối ưu nhất cho phần cứng hiện tại. Có GPU thì route lên CUDA."

---

## SLIDE 16 — Milvus: Lifecycle & Gotchas

**Thời gian:** 1.5 phút · **Speaker:** C

### Mục đích
Giải thích lifecycle đặc thù insert→flush→load→search và **đính chính các hiểu lầm kỹ thuật**.

### Nội dung hiển thị

**Lifecycle diagram:**

```
insert() → Growing Segment (RAM)
               │
    ┌──────────┴──────────┐
    │ search() khả dụng   │  ← brute-force trên growing segment
    │ NGAY LẬP TỨC        │
    └──────────┬──────────┘
               ▼
flush() → Sealed Segment → ghi MinIO  [~2530 ms]
               ▼
build index (HNSW/IVF) trên sealed
               ▼
load() → nạp index vào Query Node RAM  [~343 ms]
               ▼
search() tối ưu trên indexed segment   [~6.88 ms]
```

**Chi phí thực đo (từ project benchmark, corpus 1K):**

| Bước | Thời gian | Ghi chú |
|------|-----------|---------|
| `insert()` | ~2805 ms | 2 batches × 500 chunks |
| `flush()` | ~2530 ms | **Bước đắt nhất** — persist ra MinIO |
| `load()` | ~343 ms | Load HNSW index vào RAM |
| `search()` | ~6.88 ms | ANN query thuần |
| **Tổng lifecycle** | **~5678 ms** | |

**⚠️ Đính chính quan trọng (highlight box đỏ):**
> - ❌ SAI: "Milvus không search được trước khi flush" → ✅ ĐÚNG: Growing Segment **cho phép search() ngay** bằng brute-force
> - ❌ SAI: "flush() gây gián đoạn search" → ✅ ĐÚNG: flush() chỉ đóng băng segment, search vẫn hoạt động
> - ⚠️ Cảnh báo: Gọi flush() liên tục với data nhỏ → **phân mảnh file** → giảm hiệu năng

### Speaker Notes
> "Đây là điểm mà nhiều người hiểu sai về Milvus. Lifecycle Milvus gồm insert, flush, load rồi mới search tối ưu — tổng khoảng 5.7 giây cho corpus 1K chunks.
>
> Nhưng lưu ý quan trọng: dữ liệu **searchable ngay sau insert** bằng brute-force trên Growing Segment. Flush chỉ để đóng băng segment, chuẩn bị build index tối ưu. Và flush không gây gián đoạn search.
>
> Cảnh báo thực tế: không nên gọi flush liên tục với lượng data nhỏ — sẽ tạo nhiều sealed segment nhỏ, gây phân mảnh file và giảm hiệu năng. Production nên để Milvus tự flush theo threshold."

---

## SLIDE 17 — 🆕 Deep Dive: Milvus HA & Fault Tolerance

**Thời gian:** 2 phút · **Speaker:** C

### Mục đích
Trình bày kiến thức chuyên sâu về cơ chế chịu lỗi của hệ phân tán Milvus. So sánh HA capability với Qdrant/Weaviate.

### Nội dung hiển thị

**Các cơ chế HA:**

| Cơ chế | Mô tả |
|--------|-------|
| **etcd Quorum** | Metadata replicated qua Raft consensus — chịu được (n-1)/2 node fail |
| **Coordinator Failover** | Active-standby: Coordinator fail → standby lên thay, state phục hồi từ etcd |
| **Segment Replica** | Cùng 1 segment load trên **nhiều Query Node** — 1 node down, query vẫn chạy |
| **Message Queue Durability** | WAL qua Pulsar/Kafka — data đã ghi vào queue không bao giờ mất |
| **Object Storage** | MinIO/S3 có replication riêng — sealed segments được bảo vệ |

**Bảng so sánh HA:**

| | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| **Replication** | Shard replica (Raft) | Multi-tenancy + replica | **Segment replica per Query Node** |
| **Coordinator** | Không tách riêng | Không tách riêng | **Active-standby failover** |
| **Metadata HA** | Trong process | Trong process | **etcd cluster (Raft)** |
| **Phù hợp** | Self-host / Startup | Mid-scale | **Enterprise / Mission-critical** |

### Speaker Notes
> "Milvus là công cụ duy nhất trong 3 có cơ chế HA thực sự cho production enterprise. Metadata được lưu trên etcd cluster với Raft consensus — chịu được lỗi đa số node. Coordinator có cơ chế active-standby failover. Sealed segments có thể replicate trên nhiều Query Node — 1 node down, hệ thống vẫn phục vụ query bình thường.
>
> So sánh: Qdrant và Weaviate cũng có replication, nhưng ở mức shard replica đơn giản hơn. Milvus tách riêng từng component nên mỗi phần có chiến lược HA riêng — đây là lợi thế của kiến trúc microservices.
>
> Giờ mời D tổng hợp so sánh 3 kiến trúc."

---

## SLIDE 18 — Head-to-Head + Why X Wins (gộp)

**Thời gian:** 1.5 phút · **Speaker:** D

### Mục đích
Tổng hợp toàn bộ kiến trúc thành 1 bảng so sánh + 3 kết luận "tại sao X tốt hơn ở Y".

### Nội dung hiển thị

**Bảng so sánh rút gọn (phần trên):**

| Tiêu chí | Qdrant | Weaviate | Milvus |
|----------|--------|----------|--------|
| **Kiến trúc** | Monolithic | Monolithic | Microservices |
| **Vector Index** | Custom HNSW | HNSW (tách LSM) | Knowhere (multi-lib) |
| **Keyword Search** | Sparse vectors | **BM25F native** | Dense+Sparse (SPLADE) |
| **Filter** | **In-graph** | Allowlist+brute | `expr` pre-filter |
| **Schema** | Free | Auto | **Strict** |
| **RAM idle** | ~79 MB | ~200-300 MB | ~398 MB |
| **Containers** | 1 | 1 | 3+ |
| **Scale** | <50M vectors | <50M vectors | **>100M → tỷ** |

**3 kết luận (phần dưới — 3 cột màu):**

| 🔶 Qdrant | 🔷 Weaviate | 🟢 Milvus |
|-----------|-------------|-----------|
| **Filtered search nhanh nhất** | **Hybrid search tự nhiên nhất** | **Scale lớn nhất** |
| Filter IN graph traversal, Rust zero-overhead | BM25F + HNSW cùng shard, cùng engine | Disaggregated, scale per-role, Knowhere + GPU |

### Speaker Notes
> "Đây là bảng tổng hợp. 3 kết luận chính: Qdrant thắng ở filtered search nhờ Filterable HNSW và Rust. Weaviate thắng ở hybrid search nhờ BM25F và HNSW nằm cùng shard. Milvus thắng ở scale nhờ kiến trúc microservices và Knowhere engine."

---

## SLIDE 19 — 🆕 Deep Dive: Vector Quantization

**Thời gian:** 1.5 phút · **Speaker:** D

### Mục đích
Trình bày kỹ thuật nén vector — giải pháp production để giảm RAM và tăng throughput.

### Nội dung hiển thị

**3 kỹ thuật chính:**

| Kỹ thuật | Cách hoạt động | Tiết kiệm RAM | Trade-off |
|---------|---------------|---------------|-----------|
| **Scalar Quantization** | float32 → uint8 | **~4x** | Recall giảm nhẹ (~1-2%) |
| **Product Quantization** | Chia vector thành sub-vectors, dùng centroids | **8-64x** | Recall giảm rõ hơn, cần rescoring |
| **Binary Quantization** | Vector → binary bits | **~32x** | Tốc độ tăng **40x**, cần oversampling |

**Ma trận support:**

| | Scalar | Product | Binary | Asymmetric |
|---|:---:|:---:|:---:|:---:|
| **Qdrant** | ✅ | ✅ | ✅ | ✅ |
| **Weaviate** | — | ✅ | ✅ | — |
| **Milvus** | ✅ (IVF-SQ8) | — | — | — |

**Kết luận (1 dòng):**
> Qdrant hỗ trợ đầy đủ nhất — kèm kỹ thuật **Rescoring** (oversampling trên quantized → rescore bằng original từ disk) để giữ recall cao dù nén mạnh.

### Speaker Notes
> "Khi dataset lớn, RAM trở thành bottleneck. Quantization là giải pháp: nén vector để giảm bộ nhớ. Scalar Quantization đơn giản nhất — chuyển float32 sang uint8, tiết kiệm 4 lần RAM với recall gần như không đổi.
>
> Product Quantization mạnh hơn — tiết kiệm 8 đến 64 lần nhưng recall giảm rõ, cần rescoring. Binary Quantization cực đoan nhất — tốc độ tăng 40 lần nhưng chỉ phù hợp một số use-case.
>
> Về support: Qdrant đầy đủ nhất cả 4 kỹ thuật kèm rescoring. Weaviate có Product và Binary. Milvus hiện chỉ hỗ trợ Scalar qua IVF-SQ8.
>
> Tiếp theo mời B trình bày phần Evaluation — kiểm chứng bằng benchmark thực tế."

---

## CHUYỂN GIAO SAU SLIDE 19

> 🔄 **D → B:** "Kiến trúc và kỹ thuật đã rõ. Giờ kiểm chứng bằng số liệu. Mời B giới thiệu phương pháp benchmark."

---

## CHECKLIST ĐỢT 2B

- [x] 6 slides (14–19) đầy đủ format
- [x] Tổng thời gian: 1.5 + 1.5 + 1.5 + 2 + 1.5 + 1.5 = **9.5 phút** (C: 6.5', D: 3')
- [x] Chuyển giao: C → D (sau slide 17), D → B (sau slide 19)
- [x] Đính chính hiểu lầm kỹ thuật Milvus tại slide 16 ✅
- [x] Nội dung bám sát `docs/02_architecture.md` §2.3–§2.4
