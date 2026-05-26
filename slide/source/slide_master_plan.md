# 🎯 MASTER PLAN — PA3 HỌC THUẬT (40 phút) — v4

**Đề tài:** A Triple of Vectorstore: Qdrant, Weaviate, and Milvus  
**Thời lượng:** 40 phút thuyết trình + 15 phút Q&A  
**Tổng slide:** 29 slides · **4 Speakers × 10 phút**

---

## PHÂN BỔ SPEAKER

| Speaker | Thời gian | Phần phụ trách |
|---------|-----------|----------------|
| **A** (Trí) | **10 phút** | Opening + Overview + Benchmark Results + RAM Analysis + Benchmark Dashboard Demo |
| **B** (Tuấn) | **10 phút** | Weaviate Arch + RRF Math + Methodology + QPS vs Recall + Verdict + Demo |
| **C** (Thành) | **10 phút** | Milvus Arch + HA + Demo + Closing |
| **D** (Trực) | **10 phút** | Qdrant Arch + Pre/In-graph Filter + Comparison + Quantization + Demo |

---

## DANH SÁCH 29 SLIDES

### I · OPENING (1 phút · A)

| # | Tiêu đề | Thời gian | Speaker |
|---|---------|-----------|---------|
| 1 | Title Slide | 0.5' | A |
| 2 | Agenda / Roadmap | 0.5' | A |

### II · OVERVIEW (5 phút · A)

| # | Tiêu đề | Thời gian | Speaker |
|---|---------|-----------|---------|
| 3 | Why Vector Database? | 1.5' | A |
| 4 | How It Works: RAG Pipeline | 1' | A |
| 5 | The Big Three | 1' | A |
| 6 | Popularity & Community | 0.75' | A |
| 7 | Open-Source Landscape | 0.75' | A |

> 🔄 A → D

### III · ARCHITECTURE (21.5 phút · D → B → C → D)

#### 🔶 Qdrant (D · 5 phút)

| # | Tiêu đề | Thời gian | Speaker | Ghi chú |
|---|---------|-----------|---------|---------|
| 8 | Qdrant: Rust-Powered Engine | 1.5' | D | Diagram single-binary, Segment, WAL, ~79 MB |
| 9 | Qdrant: Filterable HNSW & ACORN | 2' | D | Thế mạnh độc bản, Query Planner adaptive |
| 10 | 🆕 Deep Dive: Pre-filter vs In-graph Filtering | 1.5' | D | **Bảng so sánh 3 chiến lược** (Pre / Post / In-graph). Diagram minh họa HNSW traversal skip node. Giải thích tại sao recall không giảm |

> 🔄 D → B

#### 🔷 Weaviate (B · 5 phút)

| # | Tiêu đề | Thời gian | Speaker | Ghi chú |
|---|---------|-----------|---------|---------|
| 11 | Weaviate: AI-Native Platform | 1.5' | B | Diagram 3-storage, Module System, ~200-300 MB |
| 12 | Weaviate: Native Hybrid Search | 2' | B | BM25F + Vector, alpha parameter, field weighting |
| 13 | 🆕 Deep Dive: RRF & Fusion Mathematics | 1.5' | B | **Công thức RRF**: `score = Σ 1/(k + rank_i)`. So sánh RRF vs RSF. Ví dụ tính toán cụ thể |

> 🔄 B → C

#### 🟢 Milvus (C · 6.5 phút)

| # | Tiêu đề | Thời gian | Speaker | Ghi chú |
|---|---------|-----------|---------|---------|
| 14 | Milvus: Distributed-First Engine | 1.5' | C | Diagram 4-layer, 3+ containers |
| 15 | Milvus: Disaggregated & Knowhere | 1.5' | C | Scale per-role, Knowhere engine, GPU |
| 16 | Milvus: Lifecycle & Gotchas | 1.5' | C | insert→flush→load→search, Growing Segment searchable ngay, flush fragmentation warning |
| 17 | 🆕 Deep Dive: Milvus HA & Fault Tolerance | 2' | C | **etcd quorum**, Coordinator failover, Segment replica trên nhiều Query Node, Message Queue durability, so sánh HA capability với Qdrant/Weaviate |

> 🔄 C → D

#### 📊 Comparison + Production (D · 3 phút)

| # | Tiêu đề | Thời gian | Speaker | Ghi chú |
|---|---------|-----------|---------|---------|
| 18 | Head-to-Head + Why X Wins *(gộp)* | 1.5' | D | Bảng so sánh rút gọn + 3 kết luận: Speed/Hybrid/Scale |
| 19 | 🆕 Deep Dive: Vector Quantization | 1.5' | D | **Scalar Quantization** (float32→uint8, 4x RAM). **Product Quantization** (sub-vectors, 8-64x). **Binary Quantization** (40x speed). Bảng so sánh support: Qdrant (đầy đủ nhất) vs Weaviate vs Milvus |

> 🔄 D → B

### IV · EVALUATION (6 phút · B → A → B)

| # | Tiêu đề | Thời gian | Speaker | Ghi chú |
|---|---------|-----------|---------|---------|
| 20 | Benchmark Setup & Methodology | 1' | B | Fairness Protocol, cùng HNSW params, corpus, seed |
| 21 | Benchmark Results | 1.5' | A | Bảng Recall@K, MRR, Latency, Errors (screenshot Dashboard) |
| 22 | 🆕 RAM & Index Build Time Analysis | 1.5' | A | **Bar chart**: RAM idle 3 DB (79 vs 300 vs 398 MB). Index build time. Milvus flush+load overhead |
| 23 | 🆕 QPS vs Recall Trade-off | 1' | B | **Scatter plot**: Pareto curve 3 DB. Sweet spot top_k. Nhận xét filter làm giảm/tăng latency |
| 24 | Verdict: Which One for What? | 1' | B | Ma trận: Prototype→Qdrant, RAG Prod→Weaviate, Enterprise→Milvus |

> 🔄 B → D

### V · DEMO (7 phút · D → B → C → A)

> [!IMPORTANT]
> **Quy tắc triển khai Demo:** Thực hiện trên **1 laptop duy nhất** để tránh thời gian chết khi đổi thiết bị giữa các Speaker. Laptop chạy sẵn `docker compose up -d` với cả 3 DB + Backend + Frontend. Mỗi Speaker lên bàn phím thao tác phần demo của mình, người trước chuyển giao cho người sau tại chỗ — không ngắt kết nối, không đổi máy.

| # | Tiêu đề | Thời gian | Speaker | Focus |
|---|---------|-----------|---------|-------|
| 25 | Demo: Qdrant — Filtered Search | 2' | D | Payload filter search trên `/hybrid`. Highlight: latency thấp, RAM ~79 MB, kết quả trả về tức thì sau insert |
| 26 | Demo: Weaviate — Hybrid Search | 2' | B | Hybrid query trên `/rag-chat` hoặc `/hybrid`. Alpha tuning (0.25 → 0.75). Highlight: BM25 + Vector trong 1 API call |
| 27 | Demo: Milvus — Scale & Lifecycle | 2' | C | Lifecycle insert→flush→load→search trên `/rag-chat`. Expr filter SQL-like. Highlight: schema chặt, hệ thống production-grade |
| 28 | Demo: Benchmark Results Dashboard | 1' | A | Quick tour React Dashboard: Latency bar chart (`/latency`), Recall@K comparison (`/accuracy`), Tradeoff Pareto curve (`/tradeoff`), DX Score radar (`/dx-score`). Chứng minh 3 DB chạy cùng 1 hệ thống, cùng fairness protocol |

> 🔄 A → C

### VI · CLOSING (1.5 phút · C)

| # | Tiêu đề | Thời gian | Speaker |
|---|---------|-----------|---------|
| 29 | Key Takeaways & Q&A | 1.5' | C |

---

## KIỂM CHỨNG THỜI LƯỢNG

| Speaker | Chi tiết | Tổng |
|---------|----------|------|
| **A** | Opening 1' + Overview 5' + Results 1.5' + RAM Analysis 1.5' + Benchmark Dashboard Demo 1' | **10'** ✅ |
| **B** | Weaviate 5' + Methodology 1' + QPS vs Recall 1' + Verdict 1' + Demo 2' | **10'** ✅ |
| **C** | Milvus 6.5' + Demo 2' + Closing 1.5' | **10'** ✅ |
| **D** | Qdrant 5' + Comparison 1.5' + Quantization 1.5' + Demo 2' | **10'** ✅ |
| **Tổng** | | **40 phút** ✅ |

---

## TIMELINE VISUAL

```
00:00 ── OPENING (A) ──────────────── 01:00  [Slide 1-2]
01:00 ── OVERVIEW (A) ─────────────── 06:00  [Slide 3-7]
06:00 ── 🔶 QDRANT ARCH (D) ──────── 11:00  [Slide 8-10]
11:00 ── 🔷 WEAVIATE ARCH (B) ─────── 16:00  [Slide 11-13]
16:00 ── 🟢 MILVUS ARCH (C) ──────── 22:30  [Slide 14-17]
22:30 ── 📊 COMPARISON + QUANT (D) ── 25:30  [Slide 18-19]
25:30 ── METHODOLOGY (B) ─────────── 26:30  [Slide 20]
26:30 ── RESULTS + RAM (A) ────────── 29:30  [Slide 21-22]
29:30 ── QPS + VERDICT (B) ────────── 31:30  [Slide 23-24]
31:30 ── 🔶 DEMO QDRANT (D) ──────── 33:30  [Slide 25]
33:30 ── 🔷 DEMO WEAVIATE (B) ────── 35:30  [Slide 26]
35:30 ── 🟢 DEMO MILVUS (C) ──────── 37:30  [Slide 27]
37:30 ── BENCHMARK DASHBOARD (A) ──── 38:30  [Slide 28]
38:30 ── CLOSING (C) ──────────────── 40:00  [Slide 29]
40:00 ── Q&A SESSION ──────────────── 55:00
```

---

## 6 SLIDES MỚI — TÓM TẮT NỘI DUNG HỌC THUẬT

| # | Slide mới | Thuộc phần | Nội dung cốt lõi |
|---|-----------|-----------|-------------------|
| 10 | Pre-filter vs In-graph | Qdrant | Bảng 3 chiến lược filter (Pre/Post/In-graph), diagram HNSW skip, lý do recall giữ nguyên |
| 13 | RRF & Fusion Math | Weaviate | Công thức RRF `1/(k+rank)`, so sánh RSF, ví dụ tính tay, alpha ảnh hưởng thế nào |
| 17 | Milvus HA | Milvus | etcd quorum, Coordinator failover, Segment replica, WAL durability |
| 19 | Vector Quantization | Production | Scalar/Product/Binary Quantization, bảng RAM savings, support matrix 3 DB |
| 22 | RAM & Index Build | Evaluation | Bar chart RAM idle, Index build time, Milvus flush+load overhead vs Qdrant instant |
| 23 | QPS vs Recall | Evaluation | Pareto curve, sweet spot top_k=5, filter impact analysis |

---

## BƯỚC TIẾP THEO

| Đợt | Slides | Speaker Notes cần viết |
|-----|--------|------------------------|
| **Đợt 1** | 1–7 (Opening + Overview) | A's notes |
| **Đợt 2** | 8–19 (Architecture + Comparison + Production) | D, B, C's notes |
| **Đợt 3** | 20–29 (Evaluation + Demo + Closing) | B, A, D, C's notes |
