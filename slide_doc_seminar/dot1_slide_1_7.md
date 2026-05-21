# ĐỢT 1 — SLIDE 1–7: OPENING + OVERVIEW

**Speaker:** A (Lê Xuân Trí) · **Tổng thời gian:** 6 phút  
**Nguồn tài liệu:** `docs/01_overview.md` §1.1–§1.5

---

## SLIDE 1 — Title Slide

**Thời gian:** 0.5 phút · **Speaker:** A

### Mục đích
Tạo ấn tượng đầu tiên chuyên nghiệp. Giới thiệu đề tài và nhóm thực hiện.

### Nội dung hiển thị

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         A TRIPLE OF VECTORSTORE                      │
│     Qdrant  ·  Weaviate  ·  Milvus                   │
│                                                      │
│     [Logo Qdrant]  [Logo Weaviate]  [Logo Milvus]    │
│                                                      │
│  ─────────────────────────────────────────────────── │
│  Seminar Cuối kỳ — Nhập môn Dữ liệu lớn (Big Data)  │
│                                                      │
│  Thành viên:                                         │
│  A · Lê Xuân Trí        — RAG Architect              │
│  B · Nguyễn Hồ Anh Tuấn — Weaviate Specialist        │
│  C · Trần Hữu Kim Thành — Milvus Specialist          │
│  D · Trần Lê Trung Trực — Qdrant Specialist          │
│                                                      │
│  Tháng 5/2026                                        │
└──────────────────────────────────────────────────────┘
```

- 3 logo xếp hàng ngang, kích thước bằng nhau
- Background tối (dark theme), typography lớn, tên đề tài là focal point
- Không cần animation phức tạp

### Speaker Notes
> "Xin chào thầy và các bạn. Hôm nay nhóm chúng tôi sẽ trình bày đề tài **A Triple of Vectorstore** — so sánh 3 hệ quản trị cơ sở dữ liệu vector phổ biến nhất hiện nay: Qdrant, Weaviate và Milvus. Chúng tôi không chỉ so sánh lý thuyết mà đã xây dựng một hệ thống benchmark full-stack để đo lường thực tế."

---

## SLIDE 2 — Agenda / Roadmap

**Thời gian:** 0.5 phút · **Speaker:** A

### Mục đích
Cho khán giả biết trước cấu trúc bài trình bày, giúp họ theo dõi mạch logic 40 phút.

### Nội dung hiển thị

```
AGENDA — 40 phút

  ① OVERVIEW ·················· Tại sao cần Vector DB?      [5 phút]
  ② ARCHITECTURE ·············· Kiến trúc 3 công cụ         [21 phút]
  ③ EVALUATION ················ Benchmark & Đánh giá        [6 phút]
  ④ DEMO ······················ Demo trực tiếp              [7 phút]

  Speakers:
  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
  │  A  │ │  D  │ │  B  │ │  C  │
  │ MC  │ │Qdrant│ │Weav.│ │Milv.│
  └─────┘ └─────┘ └─────┘ └─────┘
```

- Dùng timeline ngang hoặc dọc, mỗi phần một màu sắc riêng biệt
- Ghi rõ thời lượng từng phần
- Hiển thị 4 avatar/tên Speaker phía dưới cùng

### Speaker Notes
> "Bài trình bày gồm 4 phần chính. Đầu tiên, tôi sẽ giải thích tại sao Vector Database quan trọng trong thời đại AI. Sau đó, 3 bạn chuyên gia D, B, C lần lượt trình bày kiến trúc Qdrant, Weaviate, Milvus. Tiếp theo là phần đánh giá benchmark bằng số liệu thực tế. Và cuối cùng là demo trực tiếp trên hệ thống chúng tôi đã xây dựng. Bắt đầu nhé."

---

## SLIDE 3 — Why Vector Database?

**Thời gian:** 1.5 phút · **Speaker:** A

### Mục đích
Trả lời câu hỏi nền tảng: "LLM đã rất mạnh rồi, tại sao còn cần Vector Database?"  
Đặt bối cảnh để khán giả hiểu vai trò cốt lõi của VectorDB trước khi đi vào so sánh.

### Nội dung hiển thị

**Phần trên — 3 giới hạn LLM (icon + keyword):**

| Icon | Giới hạn | Mô tả ngắn |
|------|---------|-------------|
| 🕐 | **Knowledge Cutoff** | Chỉ biết dữ liệu đến thời điểm huấn luyện |
| 🤥 | **Hallucination** | "Bịa" thông tin khi thiếu context |
| 🔒 | **No Private Data** | Không truy cập được tài liệu nội bộ |

**Phần dưới — Giải pháp RAG (1 dòng):**

> **Retrieval-Augmented Generation (RAG)** = Bổ sung bước tìm kiếm tài liệu trước khi LLM trả lời → giảm hallucination, cập nhật real-time, dùng được dữ liệu riêng.

**Visual:** Arrow diagram đơn giản:
```
3 Giới hạn LLM  ──→  RAG giải quyết  ──→  Vector DB = Bộ nhớ ngữ nghĩa
```

### Speaker Notes
> "Các mô hình ngôn ngữ lớn như GPT hay Gemini rất ấn tượng, nhưng tồn tại 3 giới hạn nghiêm trọng. Thứ nhất, **Knowledge Cutoff** — LLM chỉ biết dữ liệu đến thời điểm huấn luyện, không biết tin mới. Thứ hai, **Hallucination** — khi không có context, LLM sẽ tự tin bịa ra câu trả lời sai. Thứ ba, LLM không thể truy cập dữ liệu riêng của tổ chức.
>
> Kiến trúc **RAG** — Retrieval-Augmented Generation — giải quyết cả 3 vấn đề này bằng cách bổ sung bước retrieval trước khi sinh text. Và **Vector Database** chính là thành phần cốt lõi trong RAG — đóng vai trò **bộ nhớ ngữ nghĩa** của hệ thống."

---

## SLIDE 4 — How It Works: RAG Pipeline

**Thời gian:** 1 phút · **Speaker:** A

### Mục đích
Giải thích cơ chế hoạt động của Vector Database trong pipeline RAG. Trả lời: "Vector DB làm gì, khác gì database truyền thống?"

### Nội dung hiển thị

**Phần trên — RAG Flow Diagram:**

```
User Query
    │
    ▼
[Embedding Model]  →  Query Vector (768 chiều)
                           │
                           ▼
                    ┌──────────────┐
                    │ Vector       │ ← Toàn bộ tài liệu đã embedding
                    │ Database     │
                    └──────┬───────┘
                           │
                      Top-K Relevant Chunks
                           │
                           ▼
                    [LLM + Context]  →  Generated Answer
```

**Phần dưới — So sánh nhanh (2 cột):**

| | SQL/NoSQL truyền thống | Vector Database |
|---|---|---|
| **Tìm kiếm** | Exact match (`WHERE name = 'X'`) | Similarity search (ANN) |
| **Dữ liệu** | Rows / Documents | Vectors 768+ chiều |
| **Ý nghĩa** | Tìm theo từ khóa | Tìm theo **ngữ nghĩa** |

### Speaker Notes
> "Pipeline RAG hoạt động như sau: Khi user đặt câu hỏi, câu hỏi được chuyển thành vector embedding — một mảng số 768 chiều. Vector Database sau đó tìm các chunk tài liệu có vector gần nhất — tức là gần **nghĩa** nhất — rồi đưa cho LLM làm context để trả lời.
>
> Điểm khác biệt cốt lõi so với database truyền thống: SQL tìm theo từ khóa chính xác, còn Vector DB tìm theo **ngữ nghĩa**. Ví dụ, bạn hỏi 'deep learning trong y tế' — Vector DB sẽ tìm được cả tài liệu viết về 'mạng nơ-ron xử lý ảnh X-quang' dù không chứa từ khóa 'deep learning'."

---

## SLIDE 5 — The Big Three

**Thời gian:** 1 phút · **Speaker:** A

### Mục đích
Giới thiệu tổng quan 3 công cụ được chọn: Qdrant, Weaviate, Milvus. Trả lời: "3 công cụ này là gì? Triết lý thiết kế khác nhau ra sao?"

### Nội dung hiển thị

**3 cột — mỗi cột 1 tool:**

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│     QDRANT       │  │     WEAVIATE      │  │     MILVUS       │
│     [Logo]       │  │     [Logo]        │  │     [Logo]        │
│                  │  │                   │  │                  │
│  🦀 Rust         │  │  🐹 Go            │  │  ⚡ C++ & Go      │
│  Est. 2021       │  │  Est. 2019        │  │  Est. 2019       │
│  Berlin, DE      │  │  Amsterdam, NL    │  │  LF AI Foundation│
│                  │  │                   │  │                  │
│  "Performance    │  │  "AI-native       │  │  "The world's    │
│   first"         │  │   all-in-one"     │  │   most advanced" │
├─────────────────┤  ├──────────────────┤  ├─────────────────┤
│ Filtered vector  │  │ Hybrid BM25 +    │  │ Distributed,     │
│ search, Rust     │  │ vector in 1 call │  │ billion-scale,   │
│ zero-overhead    │  │ + module system  │  │ GPU acceleration │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

**Tagline cuối slide:**
> **Ba công cụ, ba triết lý — Performance vs All-in-One vs Enterprise Scale**

### Speaker Notes
> "Chúng tôi chọn 3 công cụ đại diện cho 3 triết lý thiết kế khác nhau.
>
> **Qdrant** — viết bằng Rust, ra đời 2021, triết lý 'performance first'. Mọi thứ tối ưu cho latency thấp nhất.
>
> **Weaviate** — viết bằng Go, triết lý 'AI-native all-in-one'. Tích hợp sẵn hybrid search, vectorizer, generative module — build RAG pipeline ngay trong DB.
>
> **Milvus** — viết bằng C++ và Go, triết lý 'distributed-first'. Kiến trúc phân tán, scale được tới hàng tỷ vector, phù hợp enterprise.
>
> Câu hỏi đặt ra: công cụ nào phù hợp cho bài toán nào? Đó là điều chúng tôi sẽ trả lời."

---

## SLIDE 6 — Popularity & Community

**Thời gian:** 0.75 phút · **Speaker:** A

### Mục đích
Đánh giá độ phổ biến khách quan qua dữ liệu GitHub Stars và vị trí trên bản đồ công nghệ.

### Nội dung hiển thị

**Horizontal bar chart — GitHub Stars (5/2026):**

```
Milvus   ████████████████████████████████████████████  44,400+ ⭐
Qdrant   █████████████████████████████████             31,400+ ⭐
Weaviate ████████████████                              16,200+ ⭐
```

**3 bullet nhận xét (bên phải chart):**
- 🏆 **Milvus** dẫn đầu — backed by Linux Foundation, enterprise adoption (Alibaba, eBay)
- 🚀 **Qdrant** tăng trưởng nhanh nhất — Rust appeal + RAG/AI Agent wave 2023-2025
- 🛠️ **Weaviate** — DX tốt, module phong phú, phổ biến ở châu Âu

**Footnote nhỏ:**
> ⚠️ GitHub stars ≠ chất lượng. Benchmark thực tế sẽ được trình bày ở phần Evaluation.

### Speaker Notes
> "Về độ phổ biến, Milvus dẫn đầu GitHub stars nhờ lịch sử lâu đời và backing từ Linux Foundation. Qdrant tăng trưởng nhanh nhất giai đoạn 2023 đến nay nhờ hiệu năng Rust và làn sóng RAG. Weaviate có ít stars nhất nhưng bù lại developer experience rất tốt. Tuy nhiên, stars không phản ánh chất lượng — chúng tôi sẽ dùng benchmark thực tế để đánh giá ở phần sau."

---

## SLIDE 7 — Open-Source Landscape

**Thời gian:** 0.75 phút · **Speaker:** A

### Mục đích
Xác nhận cả 3 đều open-source thực sự, phân tích license, và highlight điểm đặc biệt: Milvus = LF AI Graduated Project.

### Nội dung hiển thị

**Bảng License:**

| | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| **License** | Apache 2.0 | BSD 3-Clause | Apache 2.0 |
| **Quản trị** | Qdrant GmbH | Weaviate B.V. | **LF AI & Data Foundation** |
| **Self-host** | ✅ Docker, K8s | ✅ Docker, K8s | ✅ Docker, K8s, Operator |
| **Managed Cloud** | Qdrant Cloud | Weaviate Cloud | Zilliz Cloud |

**Highlight box:**

```
🏛️ Milvus = Graduated Project của Linux Foundation
   → Governance độc lập, Technical Steering Committee
   → Cùng cấp với ONNX, Horovod
   → Qdrant & Weaviate vẫn do công ty sáng lập điều hành
```

### Speaker Notes
> "Cả 3 công cụ đều là open-source thực sự với license permissive — Apache 2.0 hoặc BSD 3-Clause — đều cho phép sử dụng thương mại tự do. Điểm đáng chú ý: Milvus là graduated project của Linux Foundation — nghĩa là governance độc lập, không bị chi phối bởi một công ty duy nhất. Qdrant và Weaviate dù mã nguồn mở nhưng vẫn do công ty sáng lập điều hành chính.
>
> Vậy là xong phần Overview. Tiếp theo, mời bạn D — Qdrant Specialist — trình bày kiến trúc chi tiết của từng công cụ."

---

## CHUYỂN GIAO SAU SLIDE 7

> 🔄 **A → D:** "Chúng ta đã có bức tranh tổng quan. Giờ đi sâu vào kiến trúc — yếu tố quyết định hiệu năng. Mời D — chuyên gia Qdrant."

---

## CHECKLIST ĐỢT 1

- [x] 7 slides đầy đủ: Tiêu đề, Mục đích, Visual, Thời gian, Speaker Notes
- [x] Tổng thời gian: 0.5 + 0.5 + 1.5 + 1 + 1 + 0.75 + 0.75 = **6 phút** ✅
- [x] Speaker duy nhất: **A** (Lê Xuân Trí)
- [x] Nội dung bám sát `docs/01_overview.md`
- [x] Mốc chuyển giao A → D tại cuối slide 7
