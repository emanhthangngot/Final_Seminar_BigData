# Kiến thức nền cần học - Lê Xuân Trí (23120099)

**Nguồn kịch bản:** `../script/tri_23120099_kich_ban.md`  
**Vai trò:** Mở đầu, RAG overview, hệ thống full-stack demo, benchmark results.  
**Mục tiêu học:** Nắm chắc RAG pipeline, ý nghĩa Vector Database, cách app benchmark tính số liệu và cách giải thích các edge case khi demo.

## 1. Những ý bắt buộc phải nắm

### RAG là gì?

RAG là **Retrieval-Augmented Generation**: LLM không trả lời một mình, mà trước tiên hệ thống truy hồi các đoạn tài liệu liên quan rồi đưa chúng vào prompt.

Pipeline trong app:

```text
PDF -> chunk -> embedding -> Vector Database
Question -> embedding -> Top-K chunks -> LLM answer
```

Trí cần nhấn mạnh: tầng retrieval quyết định **evidence** nào đi vào LLM. Nếu retrieval sai thì model mạnh vẫn có thể trả lời sai.

### Vì sao cần Vector Database?

SQL/NoSQL mạnh khi có điều kiện chính xác: `id = 10`, `name = "A"`, `category = "tech"`. Vector Database mạnh khi câu hỏi và tài liệu gần nghĩa nhưng không trùng từ khóa.

Ví dụ:

- Query: "hệ thống phản hồi chậm"
- Tài liệu: "tail latency tăng sau khi đổi index"

Keyword có thể không trùng nhiều, nhưng embedding giúp đo semantic similarity.

### App thật của nhóm gồm gì?

Từ `README.md`:

- Frontend: React + Vite + Three.js, port `5173`.
- Backend: FastAPI, port `8000`.
- Core benchmark: Python.
- Vector DB: Qdrant, Weaviate, Milvus.
- Ollama: `nomic-embed-text` cho embedding, `qwen2.5:1.5b` cho LLM.

Endpoint cần nhớ:

- `GET /api/v1/health`: kiểm tra DB online.
- `GET /api/v1/metrics`: latency samples.
- `GET /api/v1/resources`: CPU/RAM Docker containers.
- `POST /api/v1/ingest`: upload PDF.
- `POST /api/v1/chat`: RAG chat một DB.
- `POST /api/v1/chat/compare`: so sánh câu hỏi trên ba DB.
- `GET /api/v1/benchmark/accuracy/latest`: snapshot Recall/MRR.
- `GET /api/v1/benchmark/tradeoff/latest`: snapshot top_k vs recall/latency.

## 2. Công thức và cách giải thích số liệu

### Cosine similarity

Ba database dùng metric chung là `COSINE`.

```text
cosine(a, b) = (a . b) / (||a|| * ||b||)
```

Ý nghĩa: hai vector càng cùng hướng thì cosine càng cao, tức là nội dung càng gần nghĩa. Với embedding đã normalize, cosine similarity gần tương đương dot product.

### Recall@K

Trong code `evaluator.py`, mỗi chunk synthetic có ID dạng `[CID_0000001]`. Query vàng có `chunk_id` đúng. Hệ thống search Top-K, trích CID từ kết quả và kiểm tra chunk đúng có xuất hiện không.

```text
Recall@K = số query có gold chunk nằm trong Top-K / số query hợp lệ
```

Code thực tế:

```text
Recall@K = 100 * hits[K] / (len(pairs) - errors)
```

Ví dụ Milvus `Recall@10 = 44.0` nghĩa là trong 100 query, khoảng 44 query tìm thấy chunk đúng trong 10 kết quả đầu.

### MRR

MRR là **Mean Reciprocal Rank**. Nếu chunk đúng ở hạng 1 thì điểm query đó là 1. Nếu ở hạng 2 thì 1/2. Nếu ở hạng 5 thì 1/5. Nếu không tìm thấy thì 0.

```text
MRR = (1 / |Q|) * sum(1 / rank_q)
```

Trong code:

```text
rr = 1.0 / rank nếu rid == pair.chunk_id
MRR = sum(reciprocal_ranks) / n
```

Milvus `MRR = 0.2492` nghĩa là kết quả đúng không chỉ xuất hiện nhiều hơn, mà trung bình cũng xuất hiện ở vị trí tốt hơn Qdrant/Weaviate trong snapshot.

### AvgLatency_ms

Trong evaluator, latency chỉ đo quanh lệnh `db.search(...)`, không bao gồm embedding query:

```text
t0 = time.perf_counter()
chunks = db.search(qvec, top_k=top_k)
latency = (time.perf_counter() - t0) * 1000
```

Sau đó:

```text
AvgLatency_ms = tổng latency search / số query search thành công
```

Cần nói rõ: latency này là **search latency**, không phải total RAG latency. Total RAG còn có embedding time, retrieval, prompt assembly và generation time.

### Tradeoff top_k

Tradeoff sweep chạy `top_k = 1, 2, 5, 10, 20, 50`.

```text
Recall tại top_k = số query có chunk đúng trong top_k / số query
AvgLatency_ms = trung bình latency khi search với top_k đó
```

Snapshot:

| Engine | top_k=10 | Diễn giải |
|---|---:|---|
| Milvus | Recall 44.0 / 3.88 ms | Recall tốt nhất trong snapshot |
| Qdrant | Recall 9.5 / 4.87 ms | Latency thấp, nhưng recall snapshot thấp |
| Weaviate | Recall 9.5 / 15.49 ms | Dense-only snapshot không thể hiện hết lợi thế hybrid |

### DX score

DX score đến từ `dx_analyzer.py`.

```text
score = sloc * 0.5 + methods * 4 + cyclomatic * 2 + third_party_imports * 3
```

Trong đó:

- `sloc`: số dòng code không rỗng, không comment.
- `methods`: số public method trong wrapper.
- `cyclomatic`: 1 + số nhánh như if/for/while/except/with/bool op.
- `third_party_imports`: số import ngoài stdlib và ngoài `src`.

Điểm thấp hơn thường nghĩa là wrapper dễ đọc, dễ bảo trì hơn. Nhưng đây là proxy tĩnh, không thay thế trải nghiệm vận hành thật.

## 3. Số liệu benchmark cần thuộc

Snapshot `recall.csv`:

| Engine | Recall@1 | Recall@5 | Recall@10 | MRR | AvgLatency_ms | Errors |
|---|---:|---:|---:|---:|---:|---:|
| Milvus | 18.0 | 34.0 | 44.0 | 0.2492 | 4.14 | 0 |
| Qdrant | 3.0 | 7.5 | 9.5 | 0.0467 | 4.83 | 0 |
| Weaviate | 3.0 | 8.0 | 9.5 | 0.0472 | 14.47 | 0 |

Cách nói đúng:

"Milvus thắng trong snapshot accuracy này, nhưng đây là một workload cụ thể. Với workload filter-heavy hoặc hybrid keyword, kết quả và lý do chọn database có thể khác."

Không nên nói:

"Milvus là database tốt nhất."

## 4. Edge case trong web/app cần giải thích được

### Edge case 1: Backend không chạy nhưng dashboard vẫn có số liệu

Trong `frontend/src/services/api.js`, nếu API benchmark latest lỗi, frontend fallback sang CSV:

```text
/benchmark-data/combined/recall.csv
/benchmark-data/combined/tradeoff.csv
/benchmark-data/combined/metrics.csv
```

Cách giải thích khi demo:

"Nếu backend live không sẵn sàng, giao diện dùng snapshot để đảm bảo seminar ổn định. Snapshot là kết quả benchmark đã lưu, còn live API dùng để chứng minh pipeline hoạt động."

### Edge case 2: Recall trong frontend có lúc là 0.44 thay vì 44.0

Frontend `normalizeRecall()` chia các cột recall cho 100 nếu giá trị lớn hơn 1.

Ý nghĩa:

- CSV lưu `44.0` theo phần trăm.
- Chart có thể dùng `0.44` để vẽ theo tỷ lệ 0-1.

Khi nói trên slide, dùng phần trăm: `44.0%`.

### Edge case 3: `/resources` không có dữ liệu

Resource monitor đọc Docker socket `/var/run/docker.sock`. Nếu Docker socket không mount hoặc Docker daemon không chạy, app trả resource snapshot rỗng.

Cách nói:

"Resource chart phụ thuộc quyền đọc Docker stats. Nếu môi trường demo không cấp Docker socket, phần resource có thể trống; điều này không làm sai các snapshot accuracy/tradeoff."

### Edge case 4: Health có DB false

`/api/v1/health` có thể báo một DB false nếu container chưa ready, port chưa mở, hoặc service còn warm-up.

Cách xử lý khi demo:

- Không chạy benchmark live nặng.
- Dùng snapshot CSV.
- Nói rõ live health là trạng thái runtime, không phải kết quả benchmark.

### Edge case 5: Latency live khác snapshot

Latency phụ thuộc:

- Docker warm-up.
- Cache của DB.
- Model embedding/LLM local.
- CPU/RAM máy đang tải.
- Collection có vừa load hay chưa.

Câu nên nói:

"Snapshot dùng để kết luận ổn định; live demo dùng để chứng minh hệ thống có khả năng chạy end-to-end."

## 5. Câu hỏi Q&A Trí cần trả lời được

### Vì sao dùng synthetic corpus có CID?

Vì cần ground truth rõ ràng để tính Recall@K và MRR mà không cần LLM-as-judge. Mỗi chunk có ID `[CID_x]`; query vàng biết chunk đúng; evaluator kiểm tra kết quả search có chứa CID đó không.

### Vì sao không tính luôn chất lượng câu trả lời LLM?

Vì bài tập trung vào Vector Database. Chất lượng answer phụ thuộc thêm prompt, LLM, decoding và context length. Recall/MRR cô lập tầng retrieval tốt hơn.

### Vì sao cùng HNSW config vẫn chưa hoàn toàn tuyệt đối công bằng?

Vì mỗi database có storage model, query planner, lifecycle và SDK overhead khác nhau. Cùng config giúp kiểm soát biến chính, nhưng không xóa khác biệt kiến trúc.

### Nếu thầy hỏi app có chạy thật không?

Trả lời:

"Có. README mô tả Docker Compose gồm frontend, backend, Qdrant, Weaviate, Milvus và Ollama. Backend có các endpoint ingest, chat, metrics, resources và benchmark. Frontend có fallback snapshot để demo ổn định."

