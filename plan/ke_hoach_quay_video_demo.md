# Kế hoạch quay video demo Vector DB RAG Benchmark

**Mục tiêu video:** Chứng minh bằng demo và số liệu thực nghiệm rằng Qdrant, Weaviate, Milvus không có một "người thắng tuyệt đối"; mỗi DB vượt trội trong một trường hợp RAG cụ thể.  
**Hướng trình bày:** Nói ít về kiến trúc, tập trung vào case nào DB nào thắng 2 DB còn lại, vì sao thắng, metric nào chứng minh.  
**Tổng thời lượng gợi ý:** 8-10 phút.  
**URL demo:** `http://localhost:5173/dashboard`

## Chuẩn bị trước khi quay

1. Mở Chrome/Brave ở độ phân giải 1920x1080.
2. Zoom trình duyệt 110-125%, tùy màn hình. Nếu chữ nhỏ thì dùng 125%.
3. Ẩn bookmark bar bằng `Ctrl + Shift + B`.
4. Chạy sẵn container:
   ```bash
   docker compose up -d
   ```
5. Kiểm tra nhanh:
   - `http://localhost:5173/dashboard`
   - `http://localhost:5173/databases/qdrant`
   - `http://localhost:5173/databases/weaviate`
   - `http://localhost:5173/databases/milvus`
   - `http://localhost:5173/benchmark-workflow`
6. Khi quay, di chuyển chuột chậm. Mỗi lần nói về một số liệu, đưa chuột vào đúng biểu đồ hoặc bảng số liệu đó.

## Thông điệp chính cần lặp lại

- **Qdrant thắng** khi RAG cần metadata guardrail chặt: tenant, ACL, source, page, category.
- **Weaviate thắng** khi query vừa cần keyword exact-match vừa cần semantic vector: technical terms, mã lỗi, log, catalog.
- **Milvus thắng** khi mục tiêu là recall cao với `top_k` lớn, sau khi collection đã load vào RAM.
- **Benchmark chung** dùng Recall@K, MRR, Avg Latency và Recall/Latency trade-off để cho thấy không có DB nào tốt nhất trong mọi điều kiện.

---

# Timeline quay và lời thoại chi tiết

## Phần 1 - Mở đầu và Dashboard tổng quan

**Thời gian:** 00:00 - 01:00  
**Trang:** `/dashboard`  
**Mục tiêu:** Giới thiệu nhanh hệ thống, cho thấy 3 DB online và local setup, không đi sâu kiến trúc.

### 00:00 - 00:15

**Thao tác:** Mở `/dashboard`. Đưa chuột vào khu vực `Databases online`, `Mode`, `LLM`, `Embedding`.

**Lời thoại:**

"Kính thưa thầy và các bạn, đây là web demo benchmark RAG của nhóm. Hệ thống chạy local bằng Docker Compose và so sánh trực tiếp ba vector database: Qdrant, Weaviate và Milvus. Ở phần trên dashboard, mình có thể thấy cả ba database đang online, model sinh câu trả lời là Qwen local qua Ollama, và embedding model là nomic-embed-text."

### 00:15 - 00:35

**Thao tác:** Đưa chuột vào visualization 3 dòng trong dashboard. Di chuột lần lượt từ dòng Qdrant, Weaviate, Milvus.

**Lời thoại:**

"Visualization này chỉ dùng để định vị ba database trong demo. Em đã tách thành ba dòng riêng: Qdrant ở trên, Weaviate ở giữa, Milvus ở dưới. Phần quan trọng không phải là hình ảnh, mà là những case thực nghiệm bên dưới: mỗi database sẽ có một tình huống cụ thể mà nó vượt trội hơn hai database còn lại."

### 00:35 - 01:00

**Thao tác:** Cuộn xuống `Cấu hình triển khai hiện tại`. Đưa chuột qua từng card Qdrant, Weaviate, Milvus; chỉ nhanh vào `Shared config`.

**Lời thoại:**

"Về setup, Qdrant và Weaviate chạy như các service độc lập, còn Milvus có thêm etcd và MinIO. Để đảm bảo công bằng, cả ba cùng dùng vector 768 chiều, cùng metric Cosine và cùng cấu hình HNSW. Sau đây, em sẽ không nói nhiều về kiến trúc nữa, mà đi thẳng vào câu hỏi: trong trường hợp nào database nào thắng?"

---

## Phần 2 - Qdrant: thắng trong selective metadata guardrail

**Thời gian:** 01:00 - 02:25  
**Trang:** `/databases/qdrant`  
**Mục tiêu:** Chứng minh Qdrant thắng khi filter metadata loại bỏ candidate nhanh.

### 01:00 - 01:15

**Thao tác:** Click `Qdrant Demo` hoặc vào `/databases/qdrant`. Đưa chuột vào title `Edge case: selective payload guardrail`.

**Lời thoại:**

"Đầu tiên là Qdrant. Case em chọn cho Qdrant là selective payload guardrail. Nghĩa là trong RAG thực tế, trước khi tìm kiếm vector, hệ thống phải ép điều kiện metadata rất chặt, ví dụ như tenant, ACL, source, category hoặc page."

### 01:15 - 01:40

**Thao tác:** Đưa chuột vào block `Case setup`, đọc các filter trên UI.

**Lời thoại:**

"Ở đây query được gửi kèm filter `category = tech` và `page >= 99999`. Trong dataset demo, page này không tồn tại. Do đó kết quả đúng là không lấy ra evidence nào. Đây là case guardrail: database nào chứng minh được 'không có tài liệu hợp lệ' nhanh nhất thì database đó thắng."

### 01:40 - 02:05

**Thao tác:** Đưa chuột vào biểu đồ `Measured comparison`, hover lên thanh Qdrant.

**Lời thoại:**

"Metric của case này là latency, càng thấp càng tốt. Trên biểu đồ, Qdrant đạt khoảng 3.36 mili-giây, nhanh hơn Weaviate khoảng 4.74 mili-giây và Milvus khoảng 7.60 mili-giây. Tất cả đều trả về 0 result, nên đây là so sánh công bằng về tốc độ thực thi metadata guardrail."

### 02:05 - 02:25

**Thao tác:** Đưa chuột vào `Why this db wins` và `Scope of proof`.

**Lời thoại:**

"Kết luận của case này là: Qdrant không được claim là có recall tốt nhất trong mọi bài toán. Nhưng nếu ứng dụng RAG cần lọc theo quyền truy cập, tenant, source hoặc page trước khi truy hồi ngữ nghĩa, Qdrant là lựa chọn rất mạnh vì nó xử lý payload filter rất gọn và nhanh."

---

## Phần 3 - Weaviate: thắng trong metadata-filtered hybrid query

**Thời gian:** 02:25 - 03:55  
**Trang:** `/databases/weaviate`  
**Mục tiêu:** Chứng minh Weaviate thắng khi query cần cả keyword và semantic vector.

### 02:25 - 02:40

**Thao tác:** Click `Weaviate Demo` hoặc vào `/databases/weaviate`. Đưa chuột vào title `Edge case: metadata-filtered hybrid query`.

**Lời thoại:**

"Tiếp theo là Weaviate. Case của Weaviate là metadata-filtered hybrid query. Đây là tình huống tài liệu có nhiều từ khóa kỹ thuật, ví dụ category, vector database, payload filtering. Nếu chỉ dùng dense vector, những từ khóa chính xác này có thể bị làm mờ."

### 02:40 - 03:05

**Thao tác:** Đưa chuột vào `Benchmark input`. Chỉ vào query, filter `category=tech`, `top_k=5`, `alpha=0.5`.

**Lời thoại:**

"Input benchmark gửi cùng một request cho cả ba engine: query text, query vector, filter `category = tech`, lấy top_k bằng 5 và alpha bằng 0.5. Nói cách khác, đây không phải dense-only search, mà là hybrid search: vừa cần keyword exact-match, vừa cần semantic similarity."

### 03:05 - 03:35

**Thao tác:** Hover biểu đồ tại thanh Weaviate, sau đó lần lượt chỉ Qdrant và Milvus.

**Lời thoại:**

"Trong edge case này, Weaviate thắng về latency: khoảng 43.92 mili-giây, nhanh hơn Qdrant 47.92 mili-giây và Milvus 264.52 mili-giây trong snapshot mặc định. Quan trọng hơn, nó thắng trong đúng workload mà Weaviate sinh ra để xử lý: schema object cộng với hybrid retrieval."

### 03:35 - 03:55

**Thao tác:** Đưa chuột vào `Why this db wins` và `Scope of proof`.

**Lời thoại:**

"Điểm mạnh của Weaviate nằm ở việc kết hợp dense vector search với keyword search kiểu BM25. Vì vậy, nếu corpus của mình là log, mã lỗi, catalog sản phẩm, tên module, tên riêng, thì Weaviate có lợi thế rất rõ. Nhưng case này không nói rằng Weaviate luôn nhanh nhất trong dense-only search."

---

## Phần 4 - Milvus: thắng trong high-recall top_k sweep

**Thời gian:** 03:55 - 05:20  
**Trang:** `/databases/milvus`  
**Mục tiêu:** Chứng minh Milvus thắng khi mục tiêu là recall cao và result set lớn.

### 03:55 - 04:10

**Thao tác:** Click `Milvus Demo` hoặc vào `/databases/milvus`. Đưa chuột vào title `Edge case: high-recall top_k sweep`.

**Lời thoại:**

"Cuối cùng là Milvus. Case của Milvus khác hai case trước: ở đây em không đo một query nhỏ để lấy latency thấp nhất, mà đo khả năng bao phủ recall khi lấy nhiều evidence hơn, cụ thể là top_k bằng 50."

### 04:10 - 04:35

**Thao tác:** Đưa chuột vào `Case setup` và `Benchmark input`.

**Lời thoại:**

"Trong RAG, có những trường hợp cần recall cao hơn, ví dụ tổng hợp tài liệu dài, hỏi đáp phức tạp, hoặc cần lấy nhiều evidence để LLM có đầy đủ ngữ cảnh. Khi đó câu hỏi không còn là 'ai nhanh nhất với top_k nhỏ', mà là 'ai lấy được nhiều chunk đúng nhất khi tăng top_k'."

### 04:35 - 05:05

**Thao tác:** Hover biểu đồ tại thanh Milvus. Sau đó chỉ vào bảng số liệu Recall và Latency support.

**Lời thoại:**

"Tại top_k bằng 50, Milvus đạt Recall 80.0 phần trăm, trong khi Qdrant chỉ đạt 27.0 phần trăm và Weaviate đạt 24.5 phần trăm. Độ trễ hỗ trợ của Milvus vẫn chỉ khoảng 4.17 mili-giây trong snapshot tradeoff. Vì vậy, Milvus thắng rất rõ khi mục tiêu là high-recall retrieval."

### 05:05 - 05:20

**Thao tác:** Đưa chuột vào `Scope of proof`.

**Lời thoại:**

"Kết luận ở đây là Milvus phù hợp khi collection đã được load vào RAM và hệ thống cần lấy nhiều ứng viên liên quan. Nhưng nó không phải lựa chọn tốt nhất cho mọi metadata guardrail nhỏ hoặc query một lần cực nhẹ."

---

## Phần 5 - Benchmark Workflow: nhìn tổng thể Recall, Latency, Trade-off

**Thời gian:** 05:20 - 07:00  
**Trang:** `/benchmark-workflow`  
**Mục tiêu:** Giải thích các metric benchmark và cách đọc kết quả chung.

### 05:20 - 05:40

**Thao tác:** Click `Benchmark Results` hoặc vào `/benchmark-workflow`. Đưa chuột vào `Run config` nhưng không nhất thiết bấm chạy nếu đã có snapshot.

**Lời thoại:**

"Sau ba case riêng, mình quay lại benchmark tổng thể. Page này dùng để đo toàn bộ hệ thống trên cùng cấu hình demo: corpus size 1000 và 20 golden queries. Hai phần chính là accuracy benchmark và tradeoff sweep."

### 05:40 - 06:10

**Thao tác:** Đưa chuột vào `Accuracy results`, hover các cột Recall@1, Recall@5, Recall@10; sau đó chỉ vào bảng.

**Lời thoại:**

"Accuracy benchmark đo Recall@K và MRR. Recall@K trả lời câu hỏi: trong K kết quả đầu tiên, database có lấy được chunk đúng hay không. MRR đo vị trí trung bình của đáp án đúng, đáp án đúng xuất hiện càng sớm thì MRR càng cao. Trong snapshot này, Milvus đang có Recall@10 cao nhất, nên nếu mục tiêu là tìm được nhiều evidence đúng, Milvus đang có lợi thế."

### 06:10 - 06:40

**Thao tác:** Đưa chuột sang `Trade-off results`, hover đường/điểm của từng DB.

**Lời thoại:**

"Tradeoff chart cho thấy khi tăng top_k thì recall tăng như thế nào và latency thay đổi ra sao. Đây là biểu đồ quan trọng nhất để tránh kết luận một chiều. Một DB có thể rất nhanh ở top_k nhỏ, nhưng khi cần recall cao hơn thì DB khác lại tốt hơn."

### 06:40 - 07:00

**Thao tác:** Đưa chuột vào `Best For Scorecard`.

**Lời thoại:**

"Scorecard cuối trang tóm tắt quyết định thực tế: Qdrant cho metadata-filtered queries, Weaviate cho keyword-heavy technical docs, Milvus cho high recall và scale. Đây là cách đọc kết quả benchmark đúng hơn việc nói một database thắng tất cả."

---

## Phần 6 - RAG Chat Compare: kiểm chứng đầu ra ngữ cảnh

**Thời gian:** 07:00 - 08:10  
**Trang:** `/rag-chat`  
**Mục tiêu:** Cho thấy ba DB tạo context khác nhau cho LLM, nhưng không đi quá sâu vào kiến trúc.

### 07:00 - 07:25

**Thao tác:** Mở `/rag-chat`. Bật compare mode nếu chưa bật. Nhập query ngắn: `Vector database nào phù hợp cho RAG có metadata filter và recall cao?`

**Lời thoại:**

"Cuối cùng, em dùng RAG Chat Compare để cho thấy benchmark gần với trải nghiệm RAG thật. Một query được gửi song song qua ba database, mỗi database trả về evidence khác nhau, sau đó LLM dùng evidence đó để sinh câu trả lời."

### 07:25 - 07:55

**Thao tác:** Sau khi kết quả hiển thị, di chuột qua ba cột Qdrant, Weaviate, Milvus; chỉ vào latency và evidence.

**Lời thoại:**

"Nếu evidence của Qdrant tốt hơn trong câu hỏi có filter, đó là vì Qdrant mạnh ở payload metadata. Nếu Weaviate lấy được các từ khóa kỹ thuật rõ hơn, đó là lợi thế hybrid. Nếu Milvus lấy được nhiều ứng viên liên quan hơn khi top_k lớn, đó là lợi thế high-recall. Nghĩa là chat output chỉ là lớp hiển thị cuối cùng; gốc rễ vẫn là retrieval behavior của từng database."

### 07:55 - 08:10

**Thao tác:** Kết thúc ở summary fastest/latency nếu có.

**Lời thoại:**

"Vì vậy, phần chat này không thay thế benchmark, mà giúp mình nhìn thấy benchmark ảnh hưởng trực tiếp đến câu trả lời RAG như thế nào."

---

## Phần 7 - Kết luận: không có DB tốt nhất, chỉ có DB phù hợp case

**Thời gian:** 08:10 - 09:00  
**Trang:** quay về `/dashboard`  
**Mục tiêu:** Đóng lại bằng ma trận quyết định rõ ràng.

### 08:10 - 08:40

**Thao tác:** Quay về `/dashboard`, đưa chuột qua ba DB demo cards hoặc Best For Scorecard.

**Lời thoại:**

"Từ demo này, kết luận của nhóm là không nên chọn vector database theo cảm tính. Nếu bài toán là metadata guardrail, phân quyền tenant, ACL, source hoặc page, Qdrant là lựa chọn mạnh. Nếu bài toán là technical documents, log, mã lỗi, keyword và semantic cần đi cùng nhau, Weaviate là lựa chọn hợp lý. Nếu bài toán cần recall cao, top_k lớn, và workload đã load sẵn vào memory, Milvus cho kết quả vượt trội."

### 08:40 - 09:00

**Thao tác:** Dừng màn hình ở Dashboard overview 3 dòng. Không cần xoay nhiều.

**Lời thoại:**

"Toàn bộ web demo này được xây dựng để chứng minh điều đó bằng số liệu: mỗi DB đều có một vùng chiến thắng riêng. Phần benchmark chung giúp chúng ta thấy tradeoff, còn các DB demo page chỉ ra edge case cụ thể mà từng database vượt trội hơn hai database còn lại. Phần trình bày của em đến đây là kết thúc, em xin cảm ơn thầy và các bạn đã theo dõi."

---

# Checklist khi quay

- Dashboard: chỉ vào status online, local setup, overview 3 dòng.
- Qdrant page: nói rõ `category=tech`, `page >= 99999`, result count = 0, latency thấp nhất.
- Weaviate page: nói rõ hybrid query, text + vector + filter, thắng trong technical keyword case.
- Milvus page: nói rõ top_k=50, Recall 80.0%, thắng trong high-recall case.
- Benchmark Workflow: giải thích Recall@K, MRR, latency, tradeoff.
- RAG Chat: chỉ nói ngắn, dùng để nói retrieval behavior ảnh hưởng câu trả lời.
- Kết luận: lặp lại "không có DB tốt nhất tuyệt đối, chỉ có DB phù hợp đúng workload".
