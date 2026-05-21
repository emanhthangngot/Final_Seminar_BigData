# ĐỢT 2A — SLIDE 8–13: QDRANT + WEAVIATE ARCHITECTURE

---

## SLIDE 8 — Qdrant: Rust-Powered Engine

**Thời gian:** 1.5 phút · **Speaker:** D

### Mục đích
Giới thiệu kiến trúc tổng quan Qdrant — single-binary, Rust-native. Trả lời: "Qdrant được thiết kế như thế nào?"

### Nội dung hiển thị

**Diagram kiến trúc (chiếm 60% slide):**

```
┌──────────────────────────────────┐
│        Qdrant Server             │
│        (Single Binary · Rust)    │
├──────────────────────────────────┤
│   REST API    │    gRPC API      │
├──────────────────────────────────┤
│         Query Planner            │
│   (Adaptive Filter Strategy)     │
├──────────┬───────────┬───────────┤
│Segment 1 │ Segment 2 │ Segment N │
│ ┌──────┐ │ ┌───────┐ │ ┌──────┐ │
│ │ HNSW │ │ │Payload│ │ │Vector│ │
│ │ Index│ │ │ Index │ │ │Store │ │
│ └──────┘ │ └───────┘ │ └──────┘ │
├──────────────────────────────────┤
│  Memmap / On-Disk Storage Engine │
│         WAL (Write-Ahead Log)    │
└──────────────────────────────────┘
```

**Key Stats (sidebar phải):**

| Metric | Giá trị |
|--------|---------|
| Containers | **1 duy nhất** |
| RAM idle | **~79 MB** |
| Ngôn ngữ | **Rust** — zero GC pause |
| Sau insert | **Ready ngay** |

### Speaker Notes
> "Qdrant có kiến trúc đơn giản nhất trong 3 công cụ — toàn bộ engine nằm trong **1 binary duy nhất** viết bằng Rust. Rust đảm bảo memory-safe mà không cần Garbage Collector, nên không có GC pause ảnh hưởng latency.
>
> Đơn vị lưu trữ là **Segment** — mỗi segment chứa riêng vector storage, payload index và HNSW index. Storage engine là in-house, hỗ trợ 2 chế độ: RAM cho tốc độ cao và Memmap để OS quản lý caching.
>
> Điểm đáng chú ý: Qdrant chỉ dùng khoảng 79 MB RAM khi idle và dữ liệu sẵn sàng query ngay sau insert — không cần bước flush hay load như Milvus."

---

## SLIDE 9 — Qdrant: Filterable HNSW & ACORN

**Thời gian:** 2 phút · **Speaker:** D

### Mục đích
Trình bày **thế mạnh độc bản** của Qdrant: tích hợp filter trực tiếp vào HNSW graph traversal. Đây là slide quan trọng nhất của phần Qdrant.

### Nội dung hiển thị

**Vấn đề chung (phần trên):**

| Chiến lược | Cách hoạt động | Nhược điểm |
|-----------|----------------|------------|
| **Pre-filter** | Lọc metadata trước → search tập con | Filter chặt → HNSW graph phân mảnh → recall ↓ |
| **Post-filter** | Search trước → lọc sau | Loại nhiều kết quả → thiếu candidates |

**Giải pháp Qdrant (phần dưới — highlight box):**

```
🔑 FILTERABLE HNSW — Filter IN Graph Traversal

Khi traverse HNSW graph:
  Node A → kiểm tra filter ✅ → tính distance → giữ
  Node B → kiểm tra filter ❌ → skip → đi tiếp
  Node C → kiểm tra filter ✅ → tính distance → giữ

→ Graph connectivity được duy trì
→ Recall KHÔNG bị ảnh hưởng bởi filter
```

**ACORN (1 dòng):** Bản nâng cấp — tự adaptive chuyển giữa graph traversal và brute-force tuỳ filter selectivity.

### Speaker Notes
> "Đây là điểm khác biệt quan trọng nhất của Qdrant. Khi kết hợp vector search với metadata filter, hầu hết database dùng 2 cách: pre-filter hoặc post-filter — cả hai đều có nhược điểm.
>
> Qdrant giải quyết bằng **Filterable HNSW** — filter được kiểm tra **tại mỗi bước duyệt graph**, không phải trước hay sau. Node nào không match filter thì skip, nhưng graph connectivity vẫn được duy trì — nên recall không giảm.
>
> Thuật toán **ACORN** là bản nâng cấp, tự động chuyển chiến lược: filter match nhiều points thì dùng graph traversal; filter match ít points thì bypass HNSW, dùng brute-force trực tiếp — nhanh hơn."

---

## SLIDE 10 — 🆕 Deep Dive: Pre-filter vs In-graph Filtering

**Thời gian:** 1.5 phút · **Speaker:** D

### Mục đích
Slide học thuật chuyên sâu: so sánh trực quan 3 chiến lược filter qua diagram và dữ liệu thực đo. Chứng minh Qdrant vượt trội bằng evidence.

### Nội dung hiển thị

**Diagram 3 chiến lược (3 cột song song):**

```
PRE-FILTER              POST-FILTER             IN-GRAPH (Qdrant)
┌─────────┐            ┌─────────┐             ┌─────────┐
│Filter   │            │ HNSW    │             │ HNSW    │
│Metadata │            │ Search  │             │+Filter  │
│  ↓      │            │  ↓      │             │ (đồng   │
│Tập con  │            │Top-K    │             │  thời)  │
│  ↓      │            │  ↓      │             │  ↓      │
│ HNSW    │            │Filter   │             │ Final   │
│ Search  │            │Results  │             │ Results │
└─────────┘            └─────────┘             └─────────┘
⚠️ Graph bị            ⚠️ Thiếu                ✅ Recall giữ
   phân mảnh              candidates               nguyên
```

**Bảng so sánh tác động:**

| Chiến lược | Recall khi filter chặt | Latency overhead | Dùng bởi |
|-----------|----------------------|-----------------|----------|
| Pre-filter | ↓ Giảm mạnh | Thấp | Weaviate (allowlist) |
| Post-filter | Giữ nguyên | ↑ Tăng cao | Cách truyền thống |
| **In-graph** | **Giữ nguyên** | **Thấp** | **Qdrant (Filterable HNSW)** |

### Speaker Notes
> "Slide này so sánh trực quan 3 chiến lược. Pre-filter lọc trước rồi search trên tập con — nhanh, nhưng khi filter quá chặt, HNSW graph bị phân mảnh nghiêm trọng, recall giảm. Post-filter search trước rồi lọc sau — recall giữ được nhưng phải search nhiều hơn, latency tăng.
>
> Qdrant chọn cách thứ 3: filter **đồng thời** trong quá trình duyệt graph. Kết quả: recall giữ nguyên VÀ latency thấp. Dữ liệu thực đo từ project cho thấy Qdrant filter search thậm chí nhanh hơn dense-only baseline vì loại bỏ candidate sớm. Đây là lý do Qdrant được đánh giá cao cho bài toán filtered vector search.
>
> Tiếp theo, mời bạn B trình bày kiến trúc Weaviate."

---

## SLIDE 11 — Weaviate: AI-Native Platform

**Thời gian:** 1.5 phút · **Speaker:** B

### Mục đích
Giới thiệu kiến trúc Weaviate — 3 storage song song trong 1 shard + Module System. Trả lời: "Weaviate khác gì Qdrant về cách tổ chức dữ liệu?"

### Nội dung hiển thị

**Diagram kiến trúc:**

```
┌────────────────────────────────────────┐
│           Weaviate Server (Go)         │
├────────────────────────────────────────┤
│   REST API    │    GraphQL API         │
├────────────────────────────────────────┤
│           Module System                │
│  ┌──────────┐ ┌───────────┐ ┌────────┐│
│  │text2vec- │ │generative-│ │reranker││
│  │transform.│ │openai     │ │cohere  ││
│  └──────────┘ └───────────┘ └────────┘│
├────────────────────────────────────────┤
│      Shard (đơn vị lưu trữ)           │
│ ┌──────────┬──────────┬──────────────┐ │
│ │ Object   │ Vector   │ Inverted     │ │
│ │ Store    │ Index    │ Index        │ │
│ │ (LSM)    │ (HNSW)  │ (LSM+Bitmap) │ │
│ └──────────┴──────────┴──────────────┘ │
├────────────────────────────────────────┤
│         WAL (Write-Ahead Log)          │
└────────────────────────────────────────┘
```

**Key Stats (sidebar):**

| Metric | Giá trị |
|--------|---------|
| Containers | **1** |
| RAM idle | **~200-300 MB** |
| Ngôn ngữ | **Go** — goroutines |
| Đặc biệt | **3 storage song song** trong 1 shard |

### Speaker Notes
> "Weaviate cũng là single-binary như Qdrant, nhưng kiến trúc bên trong khác biệt rõ rệt. Điểm nổi bật: mỗi shard chứa **3 storage song song** — Object Store dùng LSM-Tree cho raw data, HNSW Index riêng cho vector, và Inverted Index dùng Roaring Bitmap cho keyword search.
>
> Việc có Inverted Index ngay trong shard là nền tảng cho thế mạnh hybrid search mà tôi sẽ trình bày ở slide sau.
>
> Ngoài ra, Module System cho phép cắm thêm vectorizer, generative, reranker — build full RAG pipeline mà không cần code ngoài."

---

## SLIDE 12 — Weaviate: Native Hybrid Search

**Thời gian:** 2 phút · **Speaker:** B

### Mục đích
Trình bày **thế mạnh độc bản** của Weaviate: BM25F + Vector Fusion trong 1 query engine. Slide quan trọng nhất phần Weaviate.

### Nội dung hiển thị

**Phần trên — Vấn đề mà Hybrid Search giải quyết:**

| Loại search | Giỏi ở | Yếu ở |
|------------|--------|-------|
| **Vector** | Hiểu ngữ nghĩa, đồng nghĩa | Bỏ sót exact keyword (mã SP, tên riêng) |
| **BM25** | Exact match, tên riêng | Không hiểu paraphrase |
| **Hybrid** | ✅ Kết hợp cả hai | — |

**Phần dưới — Flow diagram:**

```
User Query
    ├── [HNSW] → Vector Results (cosine similarity)
    ├── [BM25F] → Keyword Results (term freq × IDF)
    └── [Fusion] → Merged Ranked List
              ↓
        alpha = 0.0 → Pure BM25
        alpha = 0.5 → Balanced
        alpha = 1.0 → Pure vector
```

**Highlight:** BM25**F** cho phép field weighting: `title × 2.0 + abstract × 1.5 + body × 1.0`

**Tại sao Qdrant/Milvus không bằng? (1 bullet):**
> Weaviate chạy Inverted Index và HNSW **cùng shard, cùng query engine** — không cần external BM25 system.

### Speaker Notes
> "Đây là thế mạnh lớn nhất của Weaviate. Hybrid search kết hợp vector semantic search với BM25 keyword search trong **1 API call duy nhất**.
>
> Điểm đặc biệt: Weaviate dùng BM25**F** — không chỉ BM25 thông thường — cho phép đặt trọng số khác nhau cho từng field. Ví dụ title quan trọng gấp đôi body.
>
> Tham số `alpha` kiểm soát tỷ lệ: 0 là pure BM25, 1 là pure vector, 0.5 là cân bằng. Trong project benchmark, chúng tôi đã thử nghiệm alpha = 0.25, 0.5, 0.75.
>
> Tại sao Qdrant và Milvus không bằng ở điểm này? Vì Inverted Index và HNSW Index nằm cùng shard, cùng query engine — không cần stitch external system."

---

## SLIDE 13 — 🆕 Deep Dive: RRF & Fusion Mathematics

**Thời gian:** 1.5 phút · **Speaker:** B

### Mục đích
Slide học thuật: trình bày công thức toán học của Reciprocal Rank Fusion — thuật toán gộp kết quả hybrid search.

### Nội dung hiển thị

**Công thức RRF:**

```
                         n
RRF_score(d) =  Σ    ────────────
                i=1   k + rank_i(d)

Trong đó:
  d       = document
  n       = số lượng ranked lists (= 2: vector + BM25)
  rank_i  = thứ hạng của d trong list thứ i
  k       = hằng số smoothing (mặc định = 60)
```

**Ví dụ tính tay (bảng):**

| Document | Rank (Vector) | Rank (BM25) | RRF Score |
|----------|:---:|:---:|:---:|
| doc_A | 1 | 5 | 1/(60+1) + 1/(60+5) = **0.0318** |
| doc_B | 3 | 2 | 1/(60+3) + 1/(60+2) = **0.0321** ← Winner |
| doc_C | 2 | 8 | 1/(60+2) + 1/(60+8) = **0.0308** |

**So sánh 2 Fusion Algorithms:**

| | Relative Score Fusion (RSF) | Reciprocal Rank Fusion (RRF) |
|---|---|---|
| Dùng | Normalize scores rồi cộng | Dùng rank position |
| Ưu | Giữ thông tin score | Ổn định khi score scale khác nhau |
| Mặc định | Weaviate default | Phổ biến trong IR research |

### Speaker Notes
> "Khi có 2 ranked lists — vector results và BM25 results — cần thuật toán gộp lại. Weaviate hỗ trợ 2 cách: Relative Score Fusion và Reciprocal Rank Fusion.
>
> RRF tính score bằng tổng nghịch đảo rank: 1 chia cho k cộng rank, với k mặc định là 60. Nhìn vào ví dụ: doc_B rank 3 ở vector nhưng rank 2 ở BM25 — tổng RRF score cao hơn doc_A dù doc_A rank 1 ở vector. Đó là sức mạnh của hybrid — kết hợp cả hai tín hiệu.
>
> Ưu điểm RRF: không phụ thuộc vào scale của score — vector similarity score và BM25 score có thang hoàn toàn khác nhau, RRF chỉ cần rank."

---

## CHUYỂN GIAO SAU SLIDE 13

> 🔄 **B → C:** "Weaviate mạnh về hybrid all-in-one. Nhưng khi dataset lên tới hàng tỷ vector, kiến trúc monolithic sẽ gặp bottleneck. Mời C trình bày Milvus — hệ thống phân tán thực sự."

---

## CHECKLIST ĐỢT 2A

- [x] 6 slides (8–13) đầy đủ format
- [x] Tổng thời gian: 1.5 + 2 + 1.5 + 1.5 + 2 + 1.5 = **10 phút** (D: 5', B: 5')
- [x] Chuyển giao: D → B (sau slide 10), B → C (sau slide 13)
- [x] Nội dung bám sát `docs/02_architecture.md` §2.1–§2.2
