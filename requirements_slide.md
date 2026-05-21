### 1. MỤC TIÊU & YÊU CẦU ĐỐI VỚI BÀI SLIDE
- Chủ đề: "A triple of Vectorstore: Qdrant, Weaviate, and Milvus".
- Thời lượng thuyết trình: Đúng 30 phút. Bạn cần tự cân đối và phân bổ thời gian (ví dụ: mấy phút cho mỗi slide hoặc mỗi phần) để đảm bảo không bị cháy giáo án.
- Phân chia nhân sự: Bài thuyết trình có nhiều thành viên tham gia, mỗi thành viên phải có thời lượng nói tương đương nhau (chiếm 20% tổng điểm). Bạn hãy gợi ý các mốc chuyển giao người nói (Speaker) hợp lý giữa các phần.
- Số lượng slide: Bạn được toàn quyền quyết định tổng số lượng slide sao cho hợp lý, logic, không quá ít khiến thiếu thông tin và không quá nhiều gây ngợp trong 30 phút.

### 2. NGUYÊN TẮC THIẾT KẾ NỘI DUNG MỖI SLIDE
Với mỗi slide được tạo ra, bạn phải xuất bản nội dung theo cấu trúc rõ ràng sau:
- Slide thứ mấy & Tiêu đề Slide.
- Mục đích của Slide: Slide này sinh ra để trả lời cho câu hỏi hoặc giải quyết vấn đề gì?
- Nội dung hiển thị (Visual & Text): Không viết thành các đoạn văn dài. Hãy chuyển đổi dữ liệu thành các gạch đầu dòng (bullet points) cô đọng, keyword đắt giá, hoặc mô tả các sơ đồ so sánh (Bảng, Infographic, Sơ đồ khối ASCII) để người làm slide dễ hình dung thiết kế trực quan.
- Thời gian thuyết trình dự kiến cho slide đó.
- Kịch bản lời nói (Speaker Notes) tóm tắt: Gợi ý những ý chính mà người thuyết trình cần phải nói lúc slide này hiện lên.

### 3. CÁC ĐIỂM KỸ THUẬT CỐT LÕI BẮT BUỘC PHẢI KHAI THÁC sâu
Dựa trên tài liệu gốc, bạn phải làm nổi bật được các luận điểm cốt lõi sau trong các slide kiến trúc và tổng quan:
- Sự khác biệt về kiến trúc: Single-binary (Qdrant, Weaviate) vs Microservices phân tán (Milvus).
- Điểm độc bản của Qdrant: Filterable HNSW + thuật toán ACORN (tích hợp filter trực tiếp vào graph traversal).
- Điểm độc bản của Weaviate: Native Hybrid Search (BM25F + Vector Fusion chung 1 query engine và 1 storage shard).
- Điểm độc bản của Milvus: Tách rời hoàn toàn Storage và Compute (Query/Data/Index Nodes scale độc lập), sử dụng cơ chế Dense + Sparse Vector Search cho Hybrid Search, và bộ engine Knowhere.
- Dò và loại bỏ hoàn toàn các lỗi hiểu lầm kỹ thuật cũ (như việc nhầm lẫn Milvus dùng Inverted Index cho BM25, hay hiểu sai cơ chế Flush của Milvus làm gián đoạn việc tìm kiếm thời gian thực). Dữ liệu mới insert vẫn phải search được ngay tại Growing Segment trên RAM.