# NO1: A triple of Vectorstore: Qdrant, Weaviate, and Milvus

- **Qdrant** specializes in hybrid search (vectors + metadata) with advanced compression (binary quantization) for 40x faster searches. Weaviate integrates natively with ML frameworks (PyTorch, TensorFlow) and supports multimodal data, while Milvus scales to billions of vectors via distributed clusters and GPU acceleration. All three support real-time updates and RAG workflows.
- **Qdrant** is open-source (Apache 2.0) and offers a free tier on Qdrant Cloud (1GB RAM, 1 node, 4GB storage). Self-hosting via Docker is free but requires managing infrastructure.
- **Weaviate** is open-source (BSD-3) with a 14-day free sandbox tier (1 node, limited scalability) and indefinite free self-hosting.
- **Milvus** is open-source (Apache 2.0) and free to self-host; Zilliz Cloud provides a free tier (2 collections, 1M vectors).
All three support local deployment without fees, though cloud-based free tiers have storage/usage caps."