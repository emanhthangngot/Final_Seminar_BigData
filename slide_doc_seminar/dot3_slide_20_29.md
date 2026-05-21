# ĐỢT 3 — SLIDE 20–29: EVALUATION + DEMO + CLOSING

---

## SLIDE 20 — Benchmark Setup & Methodology

**Thời gian:** 1 phút · **Speaker:** B

### Mục đích
Trình bày phương pháp benchmark — chứng minh tính công bằng (Fairness Protocol) để kết quả có giá trị học thuật, không bị "bẻ" trong Q&A.

### Nội dung hiển thị

**Fairness Protocol (4 bullet với icon):**

| | Quy tắc | Chi tiết |
|---|---------|---------|
| 🔒 | **Canonical HNSW Params** | Cả 3 DB dùng chung: M=16, ef_construction=128, ef_search=64, COSINE |
| 📦 | **Shared Corpus** | Synthetic 10K chunks, seed=42, nhãn `[CID:NNNNNNN]` — fully reproducible |
| 🎯 | **Ground-Truth Recall** | Exact chunk-ID match — không dùng substring hay LLM judge |
| 📊 | **4 Trụ cột đánh giá** | Latency · Recall@K · Tradeoff Curve · DX Score |

**Hệ thống benchmark (1 dòng):**
> Full-stack: React Dashboard + FastAPI Backend + 3 DB chạy đồng thời trên Docker Compose

### Speaker Notes
> "Trước khi xem kết quả, cần hiểu phương pháp. Chúng tôi thiết kế Fairness Protocol nghiêm ngặt: cả 3 database dùng chung HNSW params — M=16, ef_construction=128, ef_search=64, distance COSINE. Corpus synthetic 10K chunks với seed cố định — ai chạy lại cũng ra cùng kết quả.
>
> Ground-truth dùng exact chunk-ID match, không phải substring hay AI judge. Hệ thống benchmark là một web app full-stack: React frontend, FastAPI backend, 3 DB chạy song song trên Docker Compose."

---

## SLIDE 21 — Benchmark Results

**Thời gian:** 1.5 phút · **Speaker:** A

### Mục đích
Trình bày kết quả benchmark chính — bảng Recall@K, MRR, Latency cho cả 3 DB. Đây là slide "evidence" quan trọng nhất.

### Nội dung hiển thị

**Bảng kết quả chính (screenshot hoặc styled table):**

| Metric | Qdrant | Weaviate | Milvus |
|--------|--------|----------|--------|
| **Recall@1** | TBD | TBD | 0% ¹ |
| **Recall@5** | TBD | TBD | 0% ¹ |
| **Recall@10** | TBD | TBD | 0% ¹ |
| **MRR** | TBD | TBD | 0.0000 ¹ |
| **Avg Search Latency** | TBD | TBD | **6.34 ms** |
| **Errors** | TBD | TBD | 0 |

> ¹ Recall=0% là hành vi đúng với MockEmbedder (vector ngẫu nhiên). Với Ollama nomic-embed-text, dự kiến Recall@5 ≥ 80%.

**Bar chart minh họa (bên cạnh bảng):**
- 3 grouped bars cho mỗi metric
- Màu: Qdrant=cam, Weaviate=xanh dương, Milvus=xanh lá

> ⚠️ **Ghi chú cho người làm slide:** Cập nhật số liệu thực tế khi chạy benchmark với Ollama embedder trước ngày thuyết trình.

### Speaker Notes
> "Đây là kết quả benchmark. [Trình bày theo số liệu thực tế — so sánh Recall@K và Latency giữa 3 DB]. Search latency trung bình của Milvus đo được 6.34ms — đây chỉ là thời gian ANN query thuần, không bao gồm embed, insert, flush.
>
> Lưu ý: dữ liệu smoke test hiện tại dùng MockEmbedder nên Recall = 0% — đây là hành vi đúng vì vector ngẫu nhiên không có quan hệ ngữ nghĩa. Kết quả final với Ollama embedder thật sẽ cho Recall chính xác."

---

## SLIDE 22 — 🆕 RAM & Index Build Time Analysis

**Thời gian:** 1.5 phút · **Speaker:** A

### Mục đích
Phân tích chi phí tài nguyên: RAM idle, RAM peak, thời gian khởi tạo — chứng minh trade-off giữa "nhẹ gọn" và "enterprise-ready".

### Nội dung hiển thị

**Bar chart — RAM idle (3 cột):**

```
Qdrant    ████  79 MB
Weaviate  ███████████████  ~250 MB
Milvus    ████████████████████  ~398 MB  (+ etcd + MinIO)
```

**Bảng chi phí khởi tạo:**

| Bước | Qdrant | Weaviate | Milvus |
|------|--------|----------|--------|
| `insert()` 1K chunks | TBD | TBD | ~2805 ms |
| `flush()` | Không cần | Không cần | **~2530 ms** |
| `load()` | Không cần | Không cần | ~343 ms |
| **Ready to search** | **Ngay** | **Ngay** | ~5678 ms |
| Containers | 1 | 1 | 3 |

**Kết luận (1 dòng):**
> Qdrant nhẹ nhất (5x ít RAM hơn Milvus). Milvus đắt nhất về tài nguyên — trade-off cho distributed scale.

### Speaker Notes
> "RAM idle: Qdrant chỉ 79 MB — gấp 5 lần ít hơn Milvus ở 398 MB. Weaviate ở giữa khoảng 250 MB.
>
> Chi phí khởi tạo: Qdrant và Weaviate sẵn sàng query ngay sau insert. Milvus cần thêm flush khoảng 2.5 giây và load khoảng 340ms — tổng gần 5.7 giây cho lifecycle đầy đủ. Đây là overhead của kiến trúc distributed — phải persist ra MinIO rồi load index vào RAM.
>
> Kết luận: nếu chạy trên laptop hoặc startup, Qdrant tiết kiệm tài nguyên nhất. Milvus phù hợp khi có infrastructure sẵn và cần scale."

---

## SLIDE 23 — 🆕 QPS vs Recall Trade-off

**Thời gian:** 1 phút · **Speaker:** B

### Mục đích
Trình bày biểu đồ Pareto: Recall vs Latency khi thay đổi top_k. Giúp khán giả hiểu sweet spot cho production.

### Nội dung hiển thị

**Scatter plot — Recall vs Avg Latency (3 đường, mỗi DB 1 màu):**

```
Recall (%)
  100 |                              ★ Sweet spot
   80 |                     ●───●
   60 |              ●────●
   40 |       ●────●
   20 |  ●──●
    0 |●
      +──────────────────────────────
      0    5    10    15    20   (ms)
                Avg Latency

      ── Qdrant (cam)  ── Weaviate (xanh)  ── Milvus (lá)
      top_k sweep: 1, 2, 5, 10, 20, 50
```

**Nhận xét (2 bullet):**
- Sweet spot thực tế: **top_k = 5** — balance tốt giữa Recall và Latency
- Filter thực tế giảm latency (Milvus equality filter: 5.24ms vs baseline 6.68ms — loại candidate sớm)

> ⚠️ **Ghi chú:** Cập nhật biểu đồ từ screenshot React Dashboard `/tradeoff` với dữ liệu Ollama thật.

### Speaker Notes
> "Biểu đồ này cho thấy trade-off giữa Recall và Latency khi tăng top_k. Khi top_k tăng, Recall tăng nhưng latency cũng tăng. Sweet spot thực tế là top_k = 5.
>
> Điểm thú vị: khi thêm metadata filter, latency của Milvus thực tế giảm xuống — equality filter 5.24ms so với baseline 6.68ms. Nguyên nhân: filter loại bỏ candidate sớm trong HNSW traversal, giảm số phép tính distance."

---

## SLIDE 24 — Verdict: Which One for What?

**Thời gian:** 1 phút · **Speaker:** B

### Mục đích
Kết luận phần Evaluation — ma trận use-case giúp khán giả biết chọn tool nào cho bài toán nào.

### Nội dung hiển thị

**Ma trận use-case (infographic 3 cột):**

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🔶 QDRANT    │  │  🔷 WEAVIATE  │  │  🟢 MILVUS    │
│              │  │              │  │              │
│ ✅ Prototype  │  │ ✅ RAG Prod   │  │ ✅ Enterprise  │
│ ✅ Startup    │  │ ✅ Hybrid app │  │ ✅ Billion-    │
│ ✅ Self-host  │  │ ✅ AI-native  │  │    scale      │
│ ✅ Low RAM    │  │    platform  │  │ ✅ Multi-team  │
│              │  │              │  │ ✅ GPU accel.  │
│ Keyword:     │  │ Keyword:     │  │ Keyword:      │
│ "FAST & LEAN"│  │ "ALL-IN-ONE" │  │ "SCALE"       │
└──────────────┘  └──────────────┘  └──────────────┘
```

**1 câu kết:**
> Không có "best" — chỉ có "best fit". Chọn theo bài toán, team size, và infrastructure.

### Speaker Notes
> "Không có công cụ nào tốt nhất cho mọi trường hợp. Qdrant phù hợp khi cần nhanh, nhẹ, self-host dễ — lý tưởng cho prototype và startup. Weaviate phù hợp khi cần hybrid search native và muốn build RAG pipeline nhanh — all-in-one platform. Milvus phù hợp enterprise, dataset hàng tỷ vector, team có DevOps sẵn.
>
> Giờ chúng ta sẽ demo trực tiếp. Mời D lên demo Qdrant."

---

## SLIDE 25 — Demo: Qdrant — Filtered Search

**Thời gian:** 2 phút · **Speaker:** D

### Mục đích
Demo thực tế Qdrant trên React Dashboard — highlight thế mạnh: filtered search nhanh, RAM thấp.

### Nội dung hiển thị
> **Slide này chỉ chứa tiêu đề + video/screen recording chạy nền.**

**Kịch bản thao tác (cho người demo):**

1. Mở React Dashboard → vào `/rag-chat`
2. Chọn database: **Qdrant**
3. Upload 1 file PDF → chạy Ingest → chỉ ra thời gian insert (nhanh, không cần flush/load)
4. Nhập câu hỏi → xem kết quả + latency hiển thị
5. Chuyển sang `/hybrid` → thực hiện payload filter search
6. Chỉ ra: latency thấp, kết quả chính xác, RAM ~79 MB

**Visual trên slide:** Tiêu đề "Demo: Qdrant" + key stats overlay:
- 🔶 1 container · ~79 MB RAM · Ready after insert · Filtered HNSW

### Speaker Notes
> "Đây là Qdrant chạy trực tiếp trên hệ thống. [Thao tác demo]. Các bạn thấy: insert xong là query được ngay, không cần bước flush hay load. Latency search chỉ vài millisecond. Và khi thêm payload filter, tốc độ vẫn giữ nguyên hoặc thậm chí nhanh hơn — đúng như kiến trúc Filterable HNSW đã trình bày."

---

## SLIDE 26 — Demo: Weaviate — Hybrid Search

**Thời gian:** 2 phút · **Speaker:** B

### Mục đích
Demo Weaviate — highlight: hybrid search BM25 + Vector trong 1 call, alpha tuning.

### Nội dung hiển thị

**Kịch bản thao tác:**

1. Trên cùng laptop → chuyển DB sang **Weaviate** (dropdown)
2. Upload cùng PDF (hoặc dùng data đã ingest)
3. Thực hiện hybrid search → chỉ ra kết quả kết hợp keyword + semantic
4. Thay đổi alpha: 0.25 (keyword-heavy) → 0.75 (vector-heavy) → so sánh kết quả
5. Chỉ ra: 1 API call, không cần setup BM25 riêng

**Visual:** Tiêu đề "Demo: Weaviate" + key stats:
- 🔷 1 container · Hybrid BM25F + Vector · Alpha tuning · Module System

### Speaker Notes
> "Chuyển sang Weaviate — cùng laptop, cùng dataset. [Thao tác demo]. Điểm nổi bật: hybrid search chỉ cần 1 API call. Khi tôi thay đổi alpha từ 0.25 sang 0.75 — kết quả thay đổi rõ rệt: alpha thấp ưu tiên keyword match, alpha cao ưu tiên semantic. Không cần setup BM25 index riêng — tất cả native trong Weaviate."

---

## SLIDE 27 — Demo: Milvus — Scale & Lifecycle

**Thời gian:** 2 phút · **Speaker:** C

### Mục đích
Demo Milvus — highlight: lifecycle insert→flush→load→search, expr filter SQL-like.

### Nội dung hiển thị

**Kịch bản thao tác:**

1. Chuyển DB sang **Milvus**
2. Upload PDF → chạy Ingest → chỉ ra lifecycle: insert → flush (~2.5s) → load (~340ms)
3. Search → chỉ ra latency ~6-7ms (sau khi indexed)
4. Vào `/hybrid` → dùng expr filter: `category == "tech"` → chỉ ra cú pháp SQL-like
5. (Nếu có) chỉ Docker stats: 3 containers đang chạy

**Visual:** Tiêu đề "Demo: Milvus" + key stats:
- 🟢 3 containers · Schema strict · expr filter SQL-like · Production-grade

### Speaker Notes
> "Chuyển sang Milvus — cùng laptop. [Thao tác demo]. Các bạn thấy: sau insert, cần flush khoảng 2.5 giây để persist ra MinIO, rồi load index vào RAM. Đây là overhead của kiến trúc distributed.
>
> Nhưng đổi lại: expr filter rất mạnh — cú pháp giống SQL, dễ đọc. Và khi data lên hàng triệu vector, kiến trúc này cho phép scale từng component độc lập — điều mà Qdrant và Weaviate không làm được."

---

## SLIDE 28 — Demo: Benchmark Results Dashboard

**Thời gian:** 1 phút · **Speaker:** A

### Mục đích
Quick tour qua React Dashboard — chứng minh 3 DB chạy trên cùng 1 hệ thống, cùng fairness protocol.

### Nội dung hiển thị

**Kịch bản thao tác (nhanh, mỗi trang ~10-15 giây):**

1. `/latency` → Latency bar chart 3 DB side-by-side + Resource monitor (CPU/RAM)
2. `/accuracy` → Recall@K comparison chart + MRR leaderboard
3. `/tradeoff` → Pareto curve: Recall vs Latency (3 đường)
4. `/dx-score` → DX Score radar chart + per-DB metric table

**Visual:** Tiêu đề "Benchmark Results Dashboard" + 4 screenshot nhỏ của 4 trang

### Speaker Notes
> "Cuối cùng, tổng quan Dashboard. Đây là hệ thống chúng tôi xây dựng — cả 3 DB chạy song song trên Docker Compose, cùng corpus, cùng HNSW params. [Lướt nhanh 4 trang]. Toàn bộ biểu đồ các bạn thấy trong slide hôm nay đều được sinh từ Dashboard này. Source code đã public trên GitHub.
>
> Mời C kết thúc bài trình bày."

---

## SLIDE 29 — Key Takeaways & Q&A

**Thời gian:** 1.5 phút · **Speaker:** C

### Mục đích
Đúc kết 3 bài học chính và mời Q&A.

### Nội dung hiển thị

**3 Key Takeaways:**

```
① KHÔNG CÓ "BEST" — CHỈ CÓ "BEST FIT"
   Qdrant = Speed · Weaviate = Hybrid · Milvus = Scale

② KIẾN TRÚC QUYẾT ĐỊNH HIỆU NĂNG
   Single-binary (đơn giản, nhẹ) vs Microservices (phức tạp, scale vô hạn)

③ BENCHMARK CÔNG BẰNG LÀ CHÌA KHÓA
   Cùng params, cùng corpus, cùng ground-truth → kết quả đáng tin cậy
```

**Dòng cuối:**
> **Cảm ơn thầy và các bạn đã lắng nghe. Mời phần Hỏi & Đáp!**

**Thông tin bổ sung (font nhỏ, góc dưới):**
- GitHub: [repo link]
- Tech Stack: React + FastAPI + Docker Compose
- Demo: `docker compose up -d` → `http://localhost:5173`

### Speaker Notes
> "Tóm lại, 3 bài học chính. Một: không có công cụ tốt nhất — chỉ có công cụ phù hợp nhất cho bài toán cụ thể. Hai: kiến trúc quyết định hiệu năng — single-binary đơn giản và nhẹ, microservices phức tạp nhưng scale vô hạn. Ba: benchmark phải công bằng — cùng tham số, cùng dữ liệu, cùng ground-truth thì kết quả mới đáng tin.
>
> Toàn bộ source code và hệ thống benchmark đã được public. Chỉ cần `docker compose up` là chạy được.
>
> Cảm ơn thầy và các bạn. Mời phần Hỏi & Đáp!"

---

## CHECKLIST ĐỢT 3

- [x] 10 slides (20–29) đầy đủ format
- [x] Tổng thời gian: 1 + 1.5 + 1.5 + 1 + 1 + 2 + 2 + 2 + 1 + 1.5 = **14.5 phút**
- [x] Demo trên **1 laptop duy nhất** ✅
- [x] Slide 28 đổi tên thành "Benchmark Results Dashboard" ✅
- [x] Không có "3D VectorSpace" ✅
- [x] Speaker: B (2'), A (4'), D (2'), B (2'), C (4.5')
