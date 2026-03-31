import streamlit as st
import pandas as pd
import plotly.express as px
import os
from dotenv import load_dotenv

# Import wrappers from db_clients
from data_ingestion.processor import load_and_chunk_pdf, embed_chunks
from db_clients.dummy_client import DummyWrapper
from db_clients.qdrant_client import QdrantWrapper
from db_clients.weaviate_client import WeaviateWrapper
from db_clients.milvus_client import MilvusWrapper

load_dotenv()

st.set_page_config(page_title="Vector DB Benchmark Seminar", layout="wide")

@st.cache_resource
def load_app_engines():
    """Initialize engines once to maintain stable connections"""
    engines = {
        "Dummy (Test)": DummyWrapper(),
        "Qdrant": QdrantWrapper(),
        "Weaviate": WeaviateWrapper(),
        "Milvus": MilvusWrapper()
    }
    
    # Establish connection for all databases
    for name, engine in engines.items():
        try:
            engine.connect()
        except Exception as e:
            print(f"Failed to initialize {name}: {e}")
    return engines

def main():
    st.title("BigData Optimization Seminar: RAG Vector Database Benchmark")
    
    db_catalog = load_app_engines()
    
    # 1. Sidebar Configurations
    with st.sidebar:
        st.header("Configuration")
        selected_engine_name = st.selectbox("Select Vector Database Engine", list(db_catalog.keys()))
        active_db = db_catalog[selected_engine_name]
        
        st.divider()
        st.subheader("Data Ingestion")
        uploaded_file = st.file_uploader("Upload Academic PDF File", type=["pdf"])
        
        if uploaded_file is not None:
            if st.button("Insert into Database"):
                with st.spinner("Chunking data and generating Vectors..."):
                    # Dummy logic placeholder
                    # chunks = load_and_chunk_pdf(uploaded_file)
                    # embeddings = embed_chunks(chunks)
                    # active_db.insert(chunks, embeddings, [])
                    st.success("Data ingestion completed successfully!")

    # 2. Main Layout - Chat Interface
    st.subheader(f"RAG Chat with Engine: {selected_engine_name}")
    
    # Maintain chat history in session state
    if "messages" not in st.session_state:
        st.session_state.messages = []

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask a question related to the document..."):
        # Save user prompt
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
            
        # Retrieval (Dummy call context extraction later)
        # results = active_db.search([0.0]*1536, top_k=5)
        
        with st.chat_message("assistant"):
            mock_response = f"This is a mocked response from {selected_engine_name}... Roles B, C, D will code the backend to fetch real context."
            st.markdown(mock_response)
            
        # Save assistant response
        st.session_state.messages.append({"role": "assistant", "content": mock_response})

    st.divider()
    
    # 3. Benchmark Dashboard
    with st.expander("Real-time Performance Benchmarking Metrics", expanded=True):
        st.write("Performance data is fetched from `benchmark/metrics.csv`")
        
        try:
            df = pd.read_csv("src/benchmark/metrics.csv")
            if not df.empty:
                col1, col2 = st.columns(2)
                with col1:
                    fig_ingestion = px.bar(df, x="Engine", y="Ingestion_Time_ms", color="Engine", title="Data Ingestion Latency")
                    st.plotly_chart(fig_ingestion, use_container_width=True)
                with col2:
                    fig_query = px.bar(df, x="Engine", y="Query_Latency_ms", color="Engine", title="Query Response Latency")
                    st.plotly_chart(fig_query, use_container_width=True)
        except Exception as e:
            st.warning("Metrics data is not available yet. Please run the Benchmark commands to collect stats.")

if __name__ == "__main__":
    main()
