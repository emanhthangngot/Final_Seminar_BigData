import streamlit as st
import pandas as pd
import plotly.express as px
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Project Imports
from src.config import METRICS_FILE
from src.data_ingestion.processor import load_and_chunk_pdf
from src.data_ingestion.embedder import Embedder
from src.db_clients.qdrant import QdrantWrapper
from src.db_clients.weaviate import WeaviateWrapper
from src.db_clients.milvus import MilvusWrapper
from src.utils.logger import logger

load_dotenv()

st.set_page_config(page_title="Vector DB Benchmark Seminar", layout="wide")

@st.cache_resource
def load_app_engines():
    """Initialize engines once to maintain stable connections"""
    engines = {
        "Qdrant": QdrantWrapper(),
        "Weaviate": WeaviateWrapper(),
        "Milvus": MilvusWrapper()
    }
    
    # Establish connection for all databases
    initialized_engines = {}
    for name, engine in engines.items():
        try:
            engine.connect()
            initialized_engines[name] = engine
            logger.info(f"Successfully initialized {name}")
        except Exception as e:
            st.error(f"Failed to initialize {name}: {e}")
            logger.error(f"Failed to initialize {name}: {e}")
            
    return initialized_engines

@st.cache_resource
def get_embedder():
    return Embedder()

def main():
    st.title("BigData Optimization Seminar: RAG Vector Database Benchmark")
    
    db_catalog = load_app_engines()
    embedder = get_embedder()
    
    # 1. Sidebar Configurations
    with st.sidebar:
        st.header("Configuration")
        available_dbs = list(db_catalog.keys())
        if not available_dbs:
            st.warning("No databases connected. Check Docker status.")
            selected_engine_name = None
            active_db = None
        else:
            selected_engine_name = st.selectbox("Select Vector Database Engine", available_dbs)
            active_db = db_catalog[selected_engine_name]
        
        st.divider()
        st.subheader("Data Ingestion")
        uploaded_file = st.file_uploader("Upload Academic PDF File", type=["pdf"])
        
        if uploaded_file is not None and active_db:
            if st.button("Insert into Database"):
                with st.spinner("Processing PDF and generating Vectors..."):
                    # Save uploaded file to temp path for PyPDFLoader
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                        tmp_file.write(uploaded_file.getvalue())
                        tmp_path = tmp_file.name
                    
                    try:
                        chunks = load_and_chunk_pdf(tmp_path)
                        if chunks:
                            embeddings = embedder.embed_documents(chunks)
                            active_db.insert(chunks, embeddings)
                            st.success(f"Successfully inserted {len(chunks)} chunks into {selected_engine_name}")
                        else:
                            st.error("No text could be extracted from the PDF.")
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)

    # 2. Main Layout - Chat Interface
    if selected_engine_name:
        st.subheader(f"RAG Chat with Engine: {selected_engine_name}")
        
        if "messages" not in st.session_state:
            st.session_state.messages = []

        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

        if prompt := st.chat_input("Ask a question related to the document..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)
                
            with st.spinner("Searching and generating response..."):
                # Retrieval
                query_vector = embedder.embed_query(prompt)
                context_chunks = active_db.search(query_vector, top_k=5)
                
                # Mocked response for now (Role B/C/D will implement full RAG logic)
                context_text = "\n---\n".join(context_chunks)
                response = f"**System Context retrieved from {selected_engine_name}:**\n\n{context_text[:500]}...\n\n*(Note: LLM Integration in progress)*"
                
                with st.chat_message("assistant"):
                    st.markdown(response)
                
                st.session_state.messages.append({"role": "assistant", "content": response})

    st.divider()
    
    # 3. Benchmark Dashboard
    with st.expander("Real-time Performance Benchmarking Metrics", expanded=True):
        if METRICS_FILE.exists():
            try:
                df = pd.read_csv(METRICS_FILE)
                if not df.empty:
                    col1, col2 = st.columns(2)
                    with col1:
                        fig_latency = px.box(df, x="Engine", y="Duration_ms", color="Operation", title="Latency Distribution by Operation")
                        st.plotly_chart(fig_latency, use_container_width=True)
                    with col2:
                        avg_df = df.groupby(["Engine", "Operation"])["Duration_ms"].mean().reset_index()
                        fig_avg = px.bar(avg_df, x="Engine", y="Duration_ms", color="Operation", barmode="group", title="Average Latency (ms)")
                        st.plotly_chart(fig_avg, use_container_width=True)
                else:
                    st.info("No data in metrics.csv yet.")
            except Exception as e:
                st.error(f"Error reading metrics: {e}")
        else:
            st.info("Performance stats will appear after running ingestion/search operations.")

if __name__ == "__main__":
    main()
