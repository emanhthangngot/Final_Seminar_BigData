# 🎬 Kế Hoạch Quay Video Demo — RAG Benchmark Dashboard

> **Dự án:** RAG Benchmark — Qdrant vs Weaviate vs Milvus  
> **Stack:** React + Three.js (frontend) · FastAPI (backend) · Docker Compose  
> **URL demo:** `http://localhost:5173`  
> **Thời lượng mục tiêu:** 5–8 phút

---

## 1. Tổng Quan Cấu Trúc Video

| # | Phân cảnh | Trang dashboard | Thời lượng gợi ý |
|---|-----------|-----------------|------------------|
| 1 | Giới thiệu & khởi động hệ thống | — (terminal) | ~30s |
| 2 | Dashboard tổng quan | `/dashboard` | ~60s |
| 3 | Kiến trúc vector database | `/architecture` | ~60s |
| 4 | Ingest tài liệu PDF | `/rag-chat` (Upload) | ~45s |
| 5 | RAG Chat so sánh 3 DB | `/rag-chat` (Compare) | ~90s |
| 6 | Latency telemetry | `/latency` | ~45s |
| 7 | Accuracy & Recall@K | `/accuracy` | ~45s |
| 8 | Hybrid search ranking | `/hybrid` | ~45s |
| 9 | Developer Experience Score | `/dx-score` | ~30s |
| 10 | Kết luận | — (quay lại dashboard) | ~15s |

---

## 2. Checklist Chuẩn Bị Trước Khi Quay

### 2.1 Môi trường
- [ ] Khởi động Docker Desktop, đảm bảo daemon đang chạy
- [ ] Chạy toàn bộ stack: `docker compose up -d`
- [ ] Chờ khoảng **60–90 giây** để Qdrant, Weaviate, Milvus và Ollama sẵn sàng
- [ ] Kiểm tra health: `curl http://localhost:8000/api/v1/health`  
  → Kết quả mong đợi: `{"status":"ok","databases":{"Qdrant":true,"Weaviate":true,"Milvus":true}}`
- [ ] Mở trình duyệt Chrome/Edge ở `http://localhost:5173`, zoom **100%**, chế độ toàn màn hình
- [ ] Tắt thông báo hệ thống (Focus mode / Do not disturb)
- [ ] Tắt các tab không liên quan trong trình duyệt
- [ ] Chuẩn bị sẵn 1 file PDF nhỏ (~5–15 trang) để demo ingest (**đặt tên rõ ràng**, ví dụ: `rag_demo_doc.pdf`)

### 2.2 Phần mềm quay màn hình
- [ ] OBS Studio hoặc Windows Game Bar (`Win + G`)
- [ ] Độ phân giải ghi: **1920×1080** tối thiểu
- [ ] FPS: **30fps** trở lên
- [ ] Tắt thanh taskbar (auto-hide) hoặc quay chỉ vùng cửa sổ trình duyệt
- [ ] Kiểm tra micro (nếu có lời thuyết minh live)

### 2.3 Dữ liệu cần có sẵn
- [ ] Benchmark accuracy đã chạy ít nhất 1 lần: `POST /api/v1/benchmark/accuracy` → kết quả snapshot hiện ở `/accuracy`
- [ ] Metrics latency có dữ liệu: gọi vài lần `/api/v1/metrics` hoặc đã ingest + query trước
- [ ] DX Score API trả về dữ liệu: `GET /api/v1/dx-score`

---

## 3. Kịch Bản Từng Cảnh

---

### 🎬 Cảnh 1 — Giới Thiệu & Khởi Động (~30s)

**Màn hình:** Terminal / PowerShell

**Hành động:**
1. Hiện thư mục dự án với lệnh `ls` hoặc `dir`
2. Chạy: `docker compose up -d` (nếu chưa chạy) HOẶC `docker compose ps` để show các container đang Up
3. Chạy: `curl http://localhost:8000/api/v1/health` → kết quả `ok`

**Lời thuyết minh gợi ý:**
> *"Dự án RAG Benchmark so sánh ba vector database phổ biến — Qdrant, Weaviate và Milvus — trong bài toán Retrieval-Augmented Generation. Toàn bộ hệ thống được đóng gói bằng Docker Compose, chỉ cần một lệnh để khởi động. Chúng ta có thể thấy health check xác nhận cả ba database đã kết nối thành công."*

---

### 🎬 Cảnh 2 — Dashboard Tổng Quan (~60s)

**Màn hình:** `http://localhost:5173/dashboard`

**Hành động:**
1. Mở trang, để animation `framer-motion` fade-in chạy hết
2. Zoom nhẹ vào **hero section** — chỉ vào badge "live RAG benchmark" và tiêu đề chính
3. Chỉ vào 4 metric cards nhỏ góc phải: *Active engines, Refresh cadence, Compared DBs, Runtime mode*
4. Scroll hoặc chỉ vào **3D Vector Space Scene** (Three.js) — giải thích là visualization phân bố embedding
5. Chỉ vào **Performance Globe** — "health signal dựa trên latency benchmark"
6. Scroll xuống 3 card mô tả từng DB (Qdrant / Weaviate / Milvus)

**Điểm nhấn kỹ thuật cần nêu:**
- Dashboard tự refresh metrics mỗi 10 giây (live)
- Three.js để render không gian vector 3D trực quan
- Runtime mode hiển thị mock vs real

**Lời thuyết minh gợi ý:**
> *"Dashboard tổng quan là điểm xuất phát. Ở góc phải là bốn chỉ số thời gian thực: số engine đang online, tần suất refresh, và mode đang chạy. Hai widget Three.js bên dưới trực quan hóa không gian embedding và tín hiệu hiệu năng. Phía dưới là mô tả ngắn gọn về từng database — ngôn ngữ cài đặt, triết lý thiết kế, và vai trò trong RAG."*

---

### 🎬 Cảnh 3 — Kiến Trúc Vector Database (~60s)

**Màn hình:** `http://localhost:5173/architecture`

**Hành động:**
1. Để animation stagger fade-in chạy
2. Chỉ vào **hero section** — highlight câu "Explain why each vector database wins in different RAG scenarios"
3. Chỉ lần lượt vào 3 **SVG Architecture Diagram**:
   - **Qdrant** → "Payload-first: filter và HNSW nằm cùng một segment — single pass"
   - **Weaviate** → "Hai luồng song song: BM25 keyword + Vector HNSW → score fusion"
   - **Milvus** → "4 layer tách biệt: Access → Coordinator → Workers → Shared Storage"
4. Scroll xuống bảng **Decision Matrix** — highlight vài hàng "Choose when"

**Điểm nhấn kỹ thuật:**
- Diagram vẽ bằng SVG thuần, không dùng thư viện ngoài
- Decision matrix giải thích khi nào nên chọn từng DB

**Lời thuyết minh gợi ý:**
> *"Trang Architecture giải thích lý do mỗi database thắng trong từng kịch bản khác nhau. Qdrant kết hợp payload filter và vector HNSW trong cùng một segment — nghĩa là chỉ cần một lần pass. Weaviate chạy BM25 và vector song song rồi fusion điểm — phù hợp hybrid retrieval. Milvus tách hoàn toàn access, coordinator, worker và storage — thiết kế cho scale lên hàng tỷ vector."*

---

### 🎬 Cảnh 4 — Ingest Tài Liệu PDF (~45s)

**Màn hình:** `http://localhost:5173/rag-chat` (sidebar Upload panel)

**Hành động:**
1. Mở RAG Chat page, để layout load
2. Chỉ vào sidebar trái → panel **Databases** (3 DB với đèn xanh online)
3. Chỉ vào panel **Ollama Runtime** — mode, llm model, embedding model
4. Tìm panel **Upload** (UploadPanel component)
5. Click chọn file PDF đã chuẩn bị
6. Click nút **Ingest** → chờ progress/loading
7. Khi ingest xong → toast/thông báo thành công → tên file hiện ở input bar

**Điểm nhấn kỹ thuật:**
- `forceAll` prop → ingest vào cả 3 DB cùng lúc
- Backend chunking → embedding (nomic-embed-text via Ollama) → insert vào 3 DB song song

**Lời thuyết minh gợi ý:**
> *"Trước khi chat, chúng ta cần ingest tài liệu. Hệ thống sẽ tự động cắt PDF thành các chunk, nhúng embedding bằng model nomic-embed-text qua Ollama, rồi insert vector vào cả ba database đồng thời. Quá trình này chạy song song để đảm bảo điều kiện benchmark công bằng."*

---

### 🎬 Cảnh 5 — RAG Chat So Sánh 3 DB (~90s)

**Màn hình:** `http://localhost:5173/rag-chat` (chế độ Compare)

**Hành động:**
1. Đảm bảo toggle đang ở **Compare** mode (không phải Single)
2. Nhập câu hỏi liên quan đến nội dung PDF vừa ingest vào ô input
3. Nhấn **Send** (hoặc Enter)
4. Quan sát animation loading 3 cột song song (Qdrant / Weaviate / Milvus)
5. Khi kết quả về → chỉ vào **summary bar** phía trên: fastest_total, fastest_retrieval, embedding ms
6. Chỉ vào từng cột:
   - Answer text của từng DB
   - MetricBar: retrieval / generation / total ms
   - Badge "fastest" ở DB nhanh nhất
   - Evidence chunks (expandable `<details>`)
7. Nhập thêm 1 câu hỏi khác để show thêm session

**Điểm nhấn kỹ thuật:**
- So sánh real-time: 1 request → 3 answers song song
- Timing breakdown: retrieval ms + generation ms + total ms
- Context chunks được lưu và có thể expand

**Lời thuyết minh gợi ý:**
> *"Đây là tính năng cốt lõi của hệ thống — Compare mode. Khi gửi một câu hỏi, backend gọi cả ba database đồng thời: mỗi DB thực hiện vector search để lấy context, rồi đưa vào LLM qwen2.5:1.5b để sinh câu trả lời. Ba cột hiển thị câu trả lời, thời gian retrieval, generation, và các evidence chunk. Badge 'fastest' đánh dấu database nhanh nhất cho query này."*

---

### 🎬 Cảnh 6 — Latency Telemetry (~45s)

**Màn hình:** `http://localhost:5173/latency`

**Hành động:**
1. Để trang load, thấy 3 card p50/p95 cho từng DB
2. Chỉ vào **p50 median** và **p95 tail** của từng database
3. Chỉ vào hai biểu đồ bar chart: **Search Latency** và **Insert Latency**
4. Click filter button **"Qdrant"** → thấy chỉ hiện 1 card + focused chart
5. Click lại **"All"** để về chế độ so sánh

**Điểm nhấn kỹ thuật:**
- Metrics live-poll từ `/api/v1/metrics` mỗi 15s
- Recharts bar chart với màu riêng theo từng DB
- Filter theo DB

**Lời thuyết minh gợi ý:**
> *"Trang Latency hiển thị telemetry từ các lần benchmark thực tế. P50 là độ trễ trung vị — đại diện trải nghiệm người dùng thông thường; P95 là đuôi độ trễ — kiểm tra độ ổn định dưới tải. Hai biểu đồ bên dưới phân tách latency cho search và insert riêng biệt."*

---

### 🎬 Cảnh 7 — Accuracy & Recall@K (~45s)

**Màn hình:** `http://localhost:5173/accuracy`

**Hành động:**
1. Trang tự load snapshot benchmark mới nhất
2. Chỉ vào **RecallBarChart** — Recall@1, Recall@5, Recall@10 theo từng DB
3. Scroll xuống **bảng leaderboard** — chỉ vào các cột: Recall@1, MRR, AvgLatency_ms, Errors
4. Giải thích ý nghĩa từng chỉ số

**Điểm nhấn kỹ thuật:**
- Snapshot mode: load kết quả đã chạy từ trước, không trigger luồng benchmark mới trong khi demo
- Đánh giá bằng chunk-ID deterministic với seed cố định

**Lời thuyết minh gợi ý:**
> *"Trang Accuracy dùng snapshot mode để giữ kết quả ổn định trong khi trình bày. Hệ thống đánh giá theo Recall@K và MRR — với Recall@1 đo tỷ lệ chunk đúng xuất hiện ở vị trí đầu tiên, Recall@5 và @10 nới rộng cửa sổ. MRR cho thấy mức độ đưa chunk đúng lên cao trong ranking."*

---

### 🎬 Cảnh 8 — Hybrid Search Ranking (~45s)

**Màn hình:** `http://localhost:5173/hybrid`

**Hành động:**
1. Trang load, thấy 3 setup chips: Dataset / Mode / top_k
2. Giữ nguyên hoặc sửa query trong ô input (ví dụ: "vector database performance")
3. Click nút **"Run retrieval"**
4. Chờ kết quả — bar chart xuất hiện + 3 rank card
5. Chỉ vào ranking #1/#2/#3, latency ms, result count

**Điểm nhấn kỹ thuật:**
- Chạy retrieval-only (không generation) để đo thuần latency tìm kiếm
- Tự động fallback sang demo snapshot nếu backend API chưa có endpoint hybrid

**Lời thuyết minh gợi ý:**
> *"Trang Hybrid Search tách riêng bước retrieval khỏi generation — chỉ đo tốc độ vector search trên document đã ingest. Đây cho phép so sánh thuần retrieval performance mà không bị ảnh hưởng bởi thời gian sinh text của LLM."*

---

### 🎬 Cảnh 9 — Developer Experience Score (~30s)

**Màn hình:** `http://localhost:5173/dx-score`

**Hành động:**
1. Trang load, hiện 3 card Composite DX Score cho từng DB
2. Chỉ vào từng card chi tiết: sloc / methods / cyclomatic / third_party_imports
3. Giải thích ngắn: điểm thấp hơn = dễ tích hợp hơn

**Lời thuyết minh gợi ý:**
> *"Cuối cùng là DX Score — Developer Experience. Chúng ta đo số dòng code cần viết, số API method phải wrapper, độ phức tạp cyclomatic, và mức phụ thuộc thư viện ngoài. Composite score thấp hơn đồng nghĩa với việc tích hợp DB đó vào hệ thống RAG dễ dàng hơn."*

---

### 🎬 Cảnh 10 — Kết Luận (~15s)

**Màn hình:** Quay lại `http://localhost:5173/dashboard`

**Hành động:**
1. Navigate về Dashboard
2. Dừng lại ở hero section
3. Fade out hoặc cut

**Lời thuyết minh gợi ý:**
> *"Hệ thống cung cấp một bức tranh toàn diện để so sánh Qdrant, Weaviate và Milvus — từ kiến trúc nội bộ, trải nghiệm RAG thực tế, đến telemetry latency và chất lượng retrieval. Cảm ơn đã theo dõi."*

---

## 4. Thứ Tự Điều Hướng Trong Video

```
Terminal (health check)
   ↓
/dashboard  (overview + Three.js)
   ↓
/architecture  (SVG diagrams + decision matrix)
   ↓
/rag-chat  → upload PDF → compare mode → gửi câu hỏi
   ↓
/latency  (filter → All)
   ↓
/accuracy  (snapshot leaderboard)
   ↓
/hybrid  (run retrieval)
   ↓
/dx-score  (composite score)
   ↓
/dashboard  (kết thúc)
```

---

## 5. Tips Quay Video

| Tình huống | Xử lý |
|------------|--------|
| Dữ liệu latency/accuracy chưa có | Gọi `POST /api/v1/benchmark/accuracy` trước khi quay ít nhất 5 phút |
| DB không kết nối (đèn đỏ) | Kiểm tra `docker compose ps`, restart container bị lỗi |
| Ingest chậm | Dùng PDF nhỏ, hoặc bật `MOCK_MODE=True` trong `.env` để skip Ollama |
| Three.js lag | Đảm bảo GPU acceleration bật trong Chrome (`chrome://flags/#use-angle`) |
| Chat không phản hồi | Kiểm tra Ollama đã pull model chưa: `docker exec ollama ollama list` |
| Quay bị giật | Giảm độ phân giải ghi xuống 720p30 hoặc tắt app nặng |

---

## 6. Cấu Trúc File Video Gợi Ý (Hậu Kỳ)

```
demo_final.mp4
├── 00:00–00:30  Intro + health check (terminal)
├── 00:30–01:30  Dashboard overview
├── 01:30–02:30  Architecture diagrams
├── 02:30–03:15  Ingest PDF
├── 03:15–04:45  RAG Compare mode
├── 04:45–05:30  Latency telemetry
├── 05:30–06:15  Accuracy & Recall@K
├── 06:15–07:00  Hybrid search
├── 07:00–07:30  DX Score
└── 07:30–07:45  Outro → dashboard
```

---

> [!TIP]
> Nếu muốn video ngắn hơn (~3 phút), ưu tiên giữ lại: **Cảnh 2 (Dashboard)**, **Cảnh 3 (Architecture)**, **Cảnh 4+5 (Ingest + RAG Chat)**, và **Cảnh 6 (Latency)**. Bỏ qua Hybrid và DX Score.

> [!NOTE]
> MOCK_MODE: Nếu không có Ollama chạy đủ model, bật `MOCK_MODE=True` trong `src/config.py` — hệ thống sẽ dùng vector giả lập, chat vẫn phản hồi nhưng câu trả lời là placeholder. Phù hợp để demo flow mà không cần GPU.
