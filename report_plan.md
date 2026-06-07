# Kế hoạch viết Report — A Triple of Vector Stores (v3)

> **Trạng thái:** Khung chính để sửa báo cáo LaTeX  
> **Ngày cập nhật:** 2026-06-07  
> **Mục tiêu định dạng:** 10--15 trang, font Times New Roman hoặc tương đương cỡ 12, giãn dòng 1.5, lề tương tự MS Word mặc định  
> **Nguyên tắc biên tập:** báo cáo học thuật, không copy/dịch nguyên văn từ nguồn; kết luận benchmark phải gắn với điều kiện thí nghiệm của nhóm.

---

## 1. Mục tiêu báo cáo

Báo cáo trình bày chủ đề **A Triple of Vector Stores: Qdrant, Weaviate, and Milvus** theo hướng vừa học thuật vừa thực dụng:

1. Giải thích Vector Database được thiết kế để làm gì trong hệ sinh thái Big Data, đặc biệt trong RAG và semantic search.
2. Tổng quan ba công cụ Qdrant, Weaviate, Milvus: mục tiêu thiết kế, độ phổ biến, mã nguồn mở, pricing/free tier.
3. Phân tích kiến trúc tổng quát và kỹ thuật đặc thù của từng công cụ.
4. So sánh các công cụ trên nhiều khía cạnh: kiến trúc, vận hành, retrieval capability, benchmark, tài nguyên, developer experience.
5. Kết luận theo use case, không xếp hạng tuyệt đối.

Thông điệp chính cần giữ xuyên suốt:

> Không có Vector Database tốt nhất cho mọi bài toán; chỉ có công cụ phù hợp nhất với ràng buộc về latency, quality, hybrid retrieval, scale và chi phí vận hành.

---

## 2. Cấu trúc báo cáo và page budget

> Target nội dung chính khoảng 11--12 trang để còn chỗ cho title, mục lục và references. Nếu PDF vượt 15 trang, cắt appendix trước, sau đó giảm hình/bảng trong phần benchmark.

| Phần | Nội dung | Dung lượng mục tiêu |
|---|---|---:|
| Title + TOC | Giữ template HCMUS, metadata tiếng Việt đúng encoding | 2 trang |
| 1. Introduction | RAG, Vector Database, vai trò trong Big Data, mục tiêu báo cáo | 1 trang |
| 2. Overview, Open Source & Pricing | Mục đích thiết kế, popularity, license, free tier/cloud pricing | 2 trang |
| 3. Architecture & Key Techniques | Kiến trúc và kỹ thuật đặc thù của Qdrant, Weaviate, Milvus | 4 trang |
| 4. Comparative Evaluation | Experimental setup, metrics, benchmark snapshot, limitations | 3 trang |
| 5. Discussion | Decision matrix theo use case, trade-off tổng thể | 1.5 trang |
| 6. Conclusion | Tổng kết đóng góp và thông điệp chính | 0.5 trang |
| References | Chỉ cite nguồn đã dùng trong nội dung | 1 trang |
| Appendix | Optional, cực ngắn; bỏ nếu vượt 15 trang | 0--1 trang |
| **Tổng mục tiêu** | | **13--15 trang** |

---

## 3. Nội dung bắt buộc theo rubric

### 3.1 Tổng quan tất cả công cụ

Mỗi công cụ cần trả lời ngắn gọn:

| Công cụ | Được thiết kế để làm gì? | Điểm định vị chính |
|---|---|---|
| Qdrant | Lưu trữ và tìm kiếm vector hiệu năng cao, đặc biệt khi truy vấn kèm metadata filter | Rust, single-binary, filtered vector search, footprint gọn |
| Weaviate | Vector database AI-native cho semantic search và hybrid search | Go, schema/module system, BM25 + vector trong cùng query path |
| Milvus | Vector database phục vụ workload lớn, phân tán, enterprise-scale | Go/C++, disaggregated architecture, Knowhere, HA, GPU/DiskANN |

### 3.2 Độ phổ biến trong cộng đồng Big Data/AI

- Dùng GitHub stars và DB-Engines như tín hiệu popularity/community.
- Không xem GitHub stars là bằng chứng công cụ tốt hơn; chỉ xem là mức độ quan tâm/cộng đồng.
- Nếu dùng số liệu stars, ghi rõ thời điểm truy cập hoặc mốc trong repo/slide.

### 3.3 Open-source và pricing

Nên dùng một bảng ngắn:

| Tiêu chí | Qdrant | Weaviate | Milvus |
|---|---|---|---|
| License | Apache 2.0 | BSD-3 | Apache 2.0 |
| Self-host | Miễn phí, Docker/K8s | Miễn phí, Docker/K8s/Helm | Miễn phí, Docker/K8s/Operator |
| Managed cloud | Qdrant Cloud | Weaviate Cloud | Zilliz Cloud |
| Free tier/trial | Free tier single node | Free trial/sandbox 14 ngày | Free cluster khoảng 5GB storage |
| Governance | Company-led | Company-led | LF AI & Data Foundation |

Nguồn pricing cần kiểm tra trước khi final:

- Qdrant Pricing: https://qdrant.tech/pricing/
- Weaviate Pricing: https://weaviate.io/pricing.html
- Zilliz Free Cluster: https://docs.zilliz.com/docs/free-trials

---

## 4. Figure và table plan

### 4.1 Hình nên giữ

Giảm từ 10 hình xuống **4--5 hình chính** để giữ 10--15 trang.

| # | Hình | Dùng ở | Nguồn | Trạng thái |
|---|---|---|---|---|
| F1 | RAG Pipeline Diagram | Introduction | TikZ hiện có trong report | Giữ |
| F2 | Architecture diagrams compact | Architecture | TikZ hiện có trong report/slide | Giữ nhưng làm gọn |
| F3 | Accuracy Chart hoặc bảng Recall@K | Evaluation | `slide/images/accuracy-chart.png` hoặc table | Chỉ chọn 1 |
| F4 | Tradeoff Pareto Chart hoặc bảng top_k | Evaluation | `slide/images/tradeoff-chart.png` hoặc table | Chỉ chọn 1 |
| F5 | Dashboard screenshot | Appendix | `screenshot/dashboard.png` | Optional |

### 4.2 Hình nên bỏ hoặc chuyển appendix

| Hình | Lý do |
|---|---|
| Filterable HNSW traversal riêng | Dễ tốn trang; có thể giải thích bằng text/bullet ngắn |
| Milvus lifecycle riêng | Chỉ giữ nếu còn trang; có thể mô tả bằng một câu `insert -> flush -> index -> load -> search` |
| Latency telemetry screenshot | Dễ trùng với bảng benchmark; chỉ dùng nếu bỏ bớt table |
| RAG chat / Hybrid search screenshots | Phù hợp slide/demo hơn report; chỉ đưa appendix nếu thật sự cần |

### 4.3 Bảng bắt buộc

Giữ tối đa **5 bảng chính**:

1. Overview + open-source/pricing tổng hợp.
2. Architecture comparison.
3. Experimental setup.
4. Accuracy/latency snapshot.
5. Decision matrix theo use case.

Nếu vượt trang, gộp DX/RAM vào phần text thay vì bảng riêng.

---

## 5. Citation plan

### 5.1 Citation keys cần dùng nhất quán

Trong `report/ref/ref.bib`, ưu tiên các key sau:

| Key | Dùng ở | Ghi chú |
|---|---|---|
| `lewis2020rag` | Introduction | RAG paper |
| `malkov2020hnsw` | Introduction/Architecture | Không dùng nhầm `malkov2018hnsw` |
| `wang2021milvus` | Milvus architecture | Milvus SIGMOD paper |
| `robertson2009bm25` | Weaviate hybrid search | BM25 |
| `cormack2009rrf` | Weaviate RRF | Reciprocal Rank Fusion |
| `jegou2011pq` | Quantization | Product Quantization |
| `subramanya2019diskann` | Milvus DiskANN | DiskANN |
| `qdrantdocs`, `qdrantfilter`, `qdrantstorage` | Qdrant | Official docs/blog |
| `weaviatedocs`, `weaviatehybrid`, `weaviatemodules` | Weaviate | Official docs |
| `milvusdocs`, `milvusarch`, `milvusknowheredocs`, `milvusdiskann` | Milvus | Official docs |
| `annbenchmarks`, `dbengines` | Popularity/evaluation context | Web references |

### 5.2 Citation cleanup rules

- Không dùng `\nocite{*}` nếu references phình hoặc có entry không được nhắc đến.
- Không để citation undefined.
- Không mô tả `guo2020ann` là survey nếu entry thực tế là paper về Anisotropic Vector Quantization.
- Với pricing/popularity có thể thay bằng footnote/URL trong bib, nhưng phải thống nhất format.

---

## 6. Architecture analysis plan

Mỗi subsection kiến trúc phải trả lời 3 câu hỏi:

1. **Tại sao thiết kế như vậy?**  
   Nêu design motivation gắn với use case target.
2. **Khi nào thiết kế này vượt trội?**  
   Nêu strengths và liên hệ benchmark/khả năng vận hành.
3. **Khi nào thiết kế này gặp giới hạn?**  
   Nêu weaknesses và trade-offs.

### 6.1 Qdrant

Nội dung cần có:

- Rust, single binary, ít dependency.
- Segment chứa vector storage, payload storage, HNSW index.
- WAL và storage/memmap.
- Filtered search: payload index, query planner, filter-aware traversal.
- Quantization: scalar/product/binary, nhưng viết ngắn.
- Strengths: latency thấp trong benchmark, filter overhead nhỏ, RAM/DX tốt.
- Weaknesses: không native BM25 như Weaviate, scale/HA không phải điểm nhấn chính trong report này.

Lưu ý viết:

- Tránh khẳng định quá tuyệt đối “Qdrant luôn in-graph filtering”.
- Viết an toàn hơn: Qdrant tối ưu filtered vector search bằng payload index, query planner và filter-aware search path.
- Khi nói số liệu filter, chỉ kết luận trong điều kiện benchmark của nhóm.

### 6.2 Weaviate

Nội dung cần có:

- Go, AI-native/vector database cho RAG.
- Object store + vector HNSW + inverted index trong shard.
- Native Hybrid Search: BM25/BM25F + vector.
- RRF hoặc fusion method, tham số alpha.
- Module system: vectorizer, generative, reranker.
- Strengths: hybrid retrieval, schema/module ecosystem.
- Weaknesses: dense-only latency snapshot cao hơn, footprint lớn hơn Qdrant, không GPU path như Milvus.

### 6.3 Milvus

Nội dung cần có:

- Disaggregated architecture.
- Proxy/access layer, coordinators, QueryNode/DataNode/IndexNode.
- Storage layer: object storage, etcd, message queue.
- Knowhere abstraction, Faiss/HNSWlib/DiskANN/GPU path.
- Lifecycle: insert, flush, sealed segment, index, load, search.
- Strengths: scale lớn, HA, per-role scaling, GPU/DiskANN.
- Weaknesses: ops complexity, nhiều container/dependency, lifecycle phức tạp.

---

## 7. Experimental evidence plan

### 7.1 Dữ liệu dùng trong report

Ưu tiên dùng dữ liệu đã có trong repo, không tự suy diễn:

| Nguồn | Nội dung |
|---|---|
| `frontend/public/benchmark-data/combined/recall.csv` | Recall@K, MRR, AvgLatency |
| `frontend/public/benchmark-data/combined/tradeoff.csv` | Recall-latency sweep theo top_k |
| `docs/result/qdrant/qdrant_evaluation.md` | Qdrant filter latency, RAM, DX |
| `docs/result/weviate/weaviate_analysis.md` | Weaviate hybrid alpha sweep |
| `slide/content/06_evaluation.tex` | Hardware/software setup |
| `src/config.py` | HNSW params, corpus size, seed |

### 7.2 Consolidated benchmark snapshot

Accuracy snapshot, corpus = 10K synthetic chunks, queries = 200:

| Engine | Recall@1 | Recall@5 | Recall@10 | MRR | AvgLatency_ms | Errors |
|---|---:|---:|---:|---:|---:|---:|
| Milvus | 18.0 | 34.0 | 44.0 | 0.2492 | 4.14 | 0 |
| Qdrant | 3.0 | 7.5 | 9.5 | 0.0467 | 4.83 | 0 |
| Weaviate | 3.0 | 8.0 | 9.5 | 0.0472 | 14.47 | 0 |

Tradeoff sweep:

| Engine | K=1 | K=5 | K=10 | K=50 |
|---|---|---|---|---|
| Milvus | 18.0 / 3.65ms | 34.0 / 3.67ms | 44.0 / 3.88ms | 80.0 / 4.17ms |
| Qdrant | 3.0 / 4.57ms | 7.5 / 4.80ms | 9.5 / 4.87ms | 27.0 / 5.82ms |
| Weaviate | 3.0 / 16.19ms | 8.0 / 15.39ms | 9.5 / 15.49ms | 24.5 / 15.66ms |

Qdrant filter latency:

| Filter | Avg (ms) | Overhead |
|---|---:|---:|
| dense_only | 3.97 | -- |
| equality | 5.29 | +1.32 |
| range | 5.20 | +1.23 |
| combined | 5.73 | +1.76 |

DX/RAM summary:

| Metric | Qdrant | Weaviate | Milvus |
|---|---:|---:|---:|
| RAM after benchmark | 178.54 MB | ~200--300 MB | ~398 MB |
| Containers needed | 1 | 1 | 3+ |
| DX Complexity Score | 190.0 | 307.0 | 290.5 |
| SLOC | 232 | 306 | 379 |

### 7.3 Cách diễn giải bắt buộc

- Viết “trong benchmark snapshot của nhóm” thay vì “Milvus tốt nhất”.
- Recall tuyệt đối thấp cần được giải thích bằng synthetic corpus/vector collapse.
- Không suy rộng kết quả 10K synthetic chunks thành production corpus thật.
- Benchmark là bằng chứng trong một môi trường kiểm soát, không phải ranking chung cho mọi workload.

---

## 8. Discussion plan

Decision matrix nên là trọng tâm phần Discussion:

| Use case | Khuyến nghị | Lý do |
|---|---|---|
| Prototype/POC nhanh | Qdrant | 1 container, DX thấp nhất, vận hành gọn |
| RAG cần keyword + semantic | Weaviate | Native hybrid search, BM25 + vector |
| Enterprise scale lớn | Milvus | Disaggregated architecture, HA, Knowhere |
| Multi-tenant/ACL/filter-heavy RAG | Qdrant | Payload/filter-oriented design |
| Team nhỏ, ít ops | Qdrant hoặc Weaviate | Ít dependency hơn Milvus |

Giọng viết:

- Không dùng “database nào tốt nhất”.
- Dùng “nếu ràng buộc chính là X, lựa chọn hợp lý là Y”.
- Nêu rõ trade-off giữa simplicity, hybrid capability và distributed scale.

---

## 9. Files LaTeX cần sửa sau khi plan được chốt

| File | Hành động |
|---|---|
| `report/main.tex` | Kiểm tra metadata, font, line spacing, input order |
| `report/content/introduction.tex` | Gọt còn khoảng 1 trang |
| `report/content/overview.tex` | Gộp mục đích thiết kế + popularity |
| `report/content/opensource.tex` | Rút gọn hoặc gộp vào overview |
| `report/content/architecture.tex` | Giảm subsubsection, giữ phân tích cốt lõi |
| `report/content/evaluation.tex` | Giảm bảng, scope benchmark rõ ràng |
| `report/content/discussion.tex` | Tập trung decision matrix |
| `report/content/conclusion.tex` | Ngắn, sắc, không lặp lại quá nhiều |
| `report/ref/ref.bib` | Sửa citation keys, loại entry không dùng |
| `report/appendix/appendix.tex` | Optional; bỏ nếu vượt 15 trang |

---

## 10. Build, test và acceptance criteria

### 10.1 Build checklist

- Chạy full LaTeX build cycle với BibTeX hoặc tool tương đương.
- Không còn `undefined citation`.
- Không còn unresolved references quan trọng.
- Không có overfull box lớn trong bảng/đoạn text hiển thị rõ.
- Bảng fit đúng page width.
- Tiếng Việt hiển thị đúng encoding trong PDF.

### 10.2 Page count

- Target cuối cùng: **10--15 trang**.
- Nếu vượt 15 trang:
  1. Bỏ appendix.
  2. Bỏ dashboard screenshot.
  3. Gộp hoặc bỏ bảng DX/RAM riêng.
  4. Rút architecture subsubsection.
  5. Chỉ giữ một trong hai: accuracy chart hoặc accuracy table.

### 10.3 Academic quality

- Mỗi claim kỹ thuật quan trọng có citation hoặc dựa trên evidence trong repo.
- Pricing/popularity phải được kiểm tra bằng nguồn chính thức/trang hiện hành trước khi nộp.
- Benchmark conclusion luôn có điều kiện thí nghiệm.
- Không copy nguyên văn docs/vendor; viết lại bằng lời của nhóm.

---

## 11. Thứ tự thực hiện đề xuất

1. Sửa citation/bib và build pipeline trước để tránh lỗi references kéo dài.
2. Gọt Overview + Open Source/Pricing thành phần compact.
3. Sửa Architecture theo format motivation → workflow → trade-off.
4. Sửa Evaluation theo snapshot scoped + limitations.
5. Sửa Discussion/Conclusion cho mạch chọn công cụ theo use case.
6. Build PDF, kiểm tra page count.
7. Nếu vượt trang, cắt appendix/hình/bảng theo thứ tự trong §10.2.

---

## 12. Assumptions

- Báo cáo viết bằng tiếng Việt học thuật, giữ thuật ngữ tiếng Anh khi là thuật ngữ chuẩn.
- Dữ liệu benchmark trong repo là nguồn empirical chính.
- Appendix không bắt buộc; nội dung chính quan trọng hơn screenshot demo.
- Page count 10--15 được ưu tiên cao hơn việc đưa toàn bộ hình/bảng từ slide vào report.
44444444