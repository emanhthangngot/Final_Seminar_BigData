import { Filter, GitCompare, HardDrive } from 'lucide-react'

export const DB_DEMOS = {
  qdrant: {
    name: 'Qdrant',
    icon: Filter,
    route: '/databases/qdrant',
    label: 'Metadata filtering',
    title: 'Qdrant Payload Filtering Demo',
    summary: 'Qdrant được dùng để minh họa filter pushdown trong truy vấn vector. Page này cho thấy setup local, filter payload, hybrid/filter query và RAG answer trên cùng database.',
    focus: 'Điểm nổi bật: lọc metadata ở database trước khi evidence được đưa vào LLM.',
    query: 'Tìm nội dung trong tài liệu uploaded_pdf ở các trang đầu.',
    filters: { category: 'uploaded_pdf', page: { gte: 1, lte: 20 } },
    alpha: null,
    code: `query_filter = {
  must: [
    { key: "category", match: "uploaded_pdf" },
    { key: "page", range: { gte: 1, lte: 20 } }
  ]
}
client.query_points(vector, query_filter=query_filter, hnsw_ef=64)`,
    stages: [
      ['Setup', 'Qdrant chạy single service với REST 6333 và gRPC 6334.'],
      ['Embed query', 'Ollama nomic-embed-text tạo vector 768 chiều.'],
      ['Apply payload filter', 'Filter category/page được đẩy vào truy vấn vector.'],
      ['Retrieve evidence', 'Qdrant trả context chunks đã lọc theo metadata.'],
      ['Generate answer', 'LLM sinh câu trả lời từ evidence đã retrieve.'],
    ],
  },
  weaviate: {
    name: 'Weaviate',
    icon: GitCompare,
    route: '/databases/weaviate',
    label: 'Hybrid retrieval',
    title: 'Weaviate Hybrid Search Demo',
    summary: 'Weaviate được dùng để minh họa BM25 kết hợp dense vector search. Page này cho thấy setup local, alpha hybrid và RAG answer trên schema RAGDocument.',
    focus: 'Điểm nổi bật: kết hợp keyword match và semantic retrieval trong cùng truy vấn.',
    query: 'Tìm đoạn tài liệu có thuật ngữ kỹ thuật và nội dung liên quan.',
    filters: { category: 'uploaded_pdf' },
    alpha: 0.5,
    code: `collection.query.hybrid(
  query=query,
  vector=query_embedding,
  alpha=0.5,
  filters=Filter.by_property("category").equal("uploaded_pdf")
)`,
    stages: [
      ['Setup', 'Weaviate chạy HTTP 8080 và gRPC 50051, vectorizer tắt để dùng embedding chung.'],
      ['Embed query', 'Query được embed một lần bằng model chung.'],
      ['Hybrid query', 'BM25 và dense vector được blend bằng alpha=0.5.'],
      ['Retrieve evidence', 'Schema RAGDocument trả chunks phù hợp keyword và ngữ nghĩa.'],
      ['Generate answer', 'LLM sinh câu trả lời dựa trên context chunks.'],
    ],
  },
  milvus: {
    name: 'Milvus',
    icon: HardDrive,
    route: '/databases/milvus',
    label: 'Scale and load control',
    title: 'Milvus Collection Load Demo',
    summary: 'Milvus được dùng để minh họa vòng đời collection cho workload vector lớn: insert, flush, load vào memory và search bằng expr filter.',
    focus: 'Điểm nổi bật: kiểm soát collection load/search và tách phụ thuộc etcd, MinIO.',
    query: 'Tìm evidence trong collection đã load với filter category và page.',
    filters: { category: 'uploaded_pdf', page: { gte: 1 } },
    alpha: null,
    code: `expr = 'category == "uploaded_pdf" and page >= 1'
collection.load()
collection.search([query_vector], anns_field="embedding", param={"ef": 64}, expr=expr)`,
    stages: [
      ['Setup', 'Milvus chạy cùng etcd và MinIO, gRPC 19530 và HTTP 9091.'],
      ['Embed query', 'Query được embed thành vector 768 chiều.'],
      ['Load collection', 'Collection phải sẵn sàng trong memory trước khi search.'],
      ['Search with expr', 'Milvus áp dụng expr filter trong vector search.'],
      ['Generate answer', 'LLM sinh câu trả lời từ evidence trả về.'],
    ],
  },
}

export const DB_KEYS = Object.keys(DB_DEMOS)
