# PERSON A: Lê Xuân Trí - RAG Architect & Cẩm Nang Tối Ưu Giao Diện UI/UX
*Phiên Bản Nâng Cấp Khủng Hiệu Năng: Local Ollama Ecosystem & Giao Diện Điểm A+*

Với vai trò là Bộ mặt của đội dự án vĩ đại này, bạn không chỉ quản lý RAG Pipeline (Bộ não), mà thiết kế Website của bạn trên Streamlit là thứ ĐẦU TIÊN và DUY NHẤT hội đồng Giảng viên đánh giá về mặt Hình thức (Scoring Factor). Kế hoạch này bẻ lái hoàn toàn khỏi OpenAI API nhàm chán, hướng bạn đến hệ sinh thái **Ollama Local 100%**, đi kèm bí kíp "Độ UI/UX" như một Kỹ sư Frontend hạng nặng.

---

## 1. Bí Quyết Ăn Điểm 1: Kỹ Nghệ "Độ" Streamlit Giao Diện Chuyên Nghiệp (UI/UX Mastery)

Để cái Web Python cục mịch thoắt chốc biến thành Giao Diện Corporate Dashboard giá chục ngàn đô, hãy làm đúng 4 nguyên tắc sau tại file `app.py`:

### 1.1 Tàng Hình "Hamburger Menu" và Footer (CSS Injection)
Hội đồng rất ghép việc một cái Web nghiên cứu lại luôn hiện dòng chữ "Made with Streamlit" hay cái nút Setting 3 gạch thừa thãi trên góc phải. Bắt buộc xóa nó bằng dòng lệnh tiêm CSS sau ở đầu file `app.py`:
```python
hide_streamlit_style = """
<style>
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}
/* Bo tròn góc Khung Chat, Đổi Font sang Academic (Inter/Roboto) */
div[data-testid="stChatMessage"] {
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
</style>
"""
st.markdown(hide_streamlit_style, unsafe_allow_html=True)
```

### 1.2 Layout Khung Nhìn Tuyệt Đối (Tabs & Columns)
Đừng kéo dài lê thê con cuộn chuột (Scroll down). Hãy tạo một màn hình 2 chức năng cực "Nghệ":
- **Góc Cột (Columns):** Ở thanh bên `st.sidebar`, để toàn bộ nút chọn Database (Qdrant/Weaviate/Milvus) dưới dạng Nút bấm Dropdown cực nét. Kế bên là Nút Upload.
- **Chia Tab Main View:** Hãy bọc App bằng `tab1, tab2 = st.tabs(["💬 Chatbot Học Thuật RAG", "📊 Giám Sát Tốc Độ Cơ Sở Dữ Liệu Benchmark"])`.
  - Ở Tab 1: Độc quyền dành cho cuộc Chat trò chuyện mượt mà.
  - Ở Tab 2: Là lúc bạn Vẻ 2 cái Biểu đồ Plotly khổng lồ chói lóa. (Nhớ thiết lập Trục Y-axis biểu đồ Ingestion là Logarithmic-Scale để thanh mili-giây ngắn nhất vẫn nhìn thấy được).

### 1.3 State Management (Trạng Thái Chờ Mượt Mà)
Khi File PDF 1000 trang tải lên, AI phải nghĩ mất hàng chục giây. Việc Website đơ cứng (Freeze) là Điểm Trừ Cực Lớn.
- Nhớ phải dùng Lệnh Loading Spinner: \
  `with st.spinner('Trí Tuệ Nhân Tạo đang nuốt Văn bản, vui lòng nếm một ngụm trà...'):` 
- Và khi Băm Vector xong thì thông báo nổi lên góc màn hình cực xịn nhẹ nhàng: \
  `st.toast('✅ Database đã chèn xong dữ liệu, RAG sẵn sàng kích hoạt!')`

---

## 2. Bí Quyết Ăn Điểm 2: LangChain RAG x Local Ollama Ecosystem 

Quên cái API thu phí OpenAI đi. Việc 1 Sinh viên có thể Setup **Mô hình Khổng Lồ Ngay Trên RAM Laptop (On-Premise Deployment) SẼ LÀM HỘI ĐỒNG KHÔNG THỂ KHÔNG CHO ĐIỂM GIỎI**.

### 2.1 Cài Đặt Khối Embeddings (OllamaEmbeddings)
- **Vị trí File:** `processor.py`
- Thay vì OpenAI, bạn hãy xài `OllamaEmbeddings()`. 
- **Lưu ý Vô Cùng Cực Kỳ Quan Trọng (Nhắc Cả Team):** Hãy Pull (tải) Model chuyên Nhúng Vector tên là `nomic-embed-text` (`ollama pull nomic-embed-text`). Model này chỉ ăn có 500MB RAM, nhưng kích thước chiều Vector của nó là **768 Dimension**.
> [!CAUTION] 
> Bạn phải lập tức họp Team lại! File `qdrant_client.py` của D, `milvus_client.py` của C đang bị tôi Khóa cứng (Hard-coded) số chiều là `1536` (theo chuẩn OpenAI). NẾU TỤI NÓ KHÔNG CHỈNH VỀ `768`, DATABASE CỦA NÓ SẼ BÁO LỖI HÌNH HỌC KHÔNG GIAN VÀ SẬP MẠNG LẬP TỨC!

### 2.2 Pipeline RAG Đỉnh Cao `PyPDFLoader` vs `RecursiveSplitter`
- Bắt buộc phải Băm nhỏ câu chữ (Chunking) bằng `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)` vì Nút Overlap (Gối đầu 200 chữ) sẽ đảm bảo Cuốn Sách Văn Mẫu PDF không bị cắt đứt gãy Ngữ Nghĩa giữa chừng. Model Qwen mới có thể tự hiểu mấu chốt nối câu chữ.

### 2.3 Local LLM Conversation (`ChatOllama`)
- Vào Terminal máy tính, do hệ thống của bạn hiện đã kéo sẵn model, hãy dùng tên chính xác này: `ollama run qwen3.5:latest` (Đây là phiên bản xử lý ngữ nghĩa Tiếng Việt cực kỳ xuất sắc).
- Ở file `app.py`, sửa Mock Code thành: 
  ```python
  from langchain_community.chat_models import ChatOllama
  llm = ChatOllama(model="qwen3.5:latest", temperature=0.2) 
  ```
- **Kỹ thuật RAG Prompt Đóng Khuôn:** \
  Gom 5 mẫu Search Vector từ DB (Top_K=5) chèn lấp câu Prompt: \
  *"Dưới đây là một phần trích lục Sách Kỹ thuật: \n {Context} \n Dựa tuyệt đối vào đoạn Text trên, hãy trả lời câu hỏi sau bằng Tiếng Việt một cách ngắn gọn Cực Độ: {User_Question}"*
- Gọi Invoke Qwen3.5 đáp trả Stream lên `st.write_stream()` và hốt ngay Trọn Bộ Điểm 10!
