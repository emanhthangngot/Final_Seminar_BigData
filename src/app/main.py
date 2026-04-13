import streamlit as st
import pandas as pd
import plotly.express as px
import os
import tempfile
from pathlib import Path

# Project Imports
from src.config import METRICS_FILE, MOCK_MODE
from src.core.data_ingestion.processor import load_and_chunk_pdf
from src.core.data_ingestion.embedder import Embedder
from src.core.data_ingestion.generator import LLMGenerator
from src.core.db_clients.qdrant import QdrantWrapper
from src.core.db_clients.weaviate import WeaviateWrapper
from src.core.db_clients.milvus import MilvusWrapper
from src.core.benchmark.resource_monitor import get_all_stats
from src.core.benchmark.stress_test import run_stress_test
from src.core.utils.logger import logger

st.set_page_config(page_title="RAG Benchmark | Vector Database", layout="wide")

# Custom CSS for Neon Pro Max aesthetic
def inject_custom_css():
    st.markdown("""
    <style>
    /* Global Base */
    .stApp {
        background-color: #050506;
        color: #eaeaea;
        font-family: 'Inter', 'Roboto', sans-serif;
    }

    /* Streamlit overrides */
    div[data-testid="stSidebar"] {
        background-color: rgba(10, 10, 15, 0.7);
        backdrop-filter: blur(12px);
        border-right: 1px solid rgba(94, 106, 210, 0.2);
    }
    
    /* Typography & Headers */
    h1, h2, h3 {
        color: #ffffff !important;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    h1 {
        text-shadow: 0 0 20px rgba(94, 106, 210, 0.6);
        font-weight: 800;
        margin-bottom: 30px;
    }

    /* Buttons */
    div.stButton > button {
        background: linear-gradient(135deg, #5E6AD2, #7C3AED);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.5rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
    }
    div.stButton > button:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.6);
        color: white;
    }
    
    /* Expander / Bento Grid Cards */
    div[data-testid="stExpander"] {
        background: rgba(20, 20, 30, 0.6);
        border: 1px solid rgba(124, 58, 237, 0.2);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(94, 106, 210, 0.1);
    }
    
    /* Mock Mode Indicator */
    .mock-badge {
        background: rgba(124, 58, 237, 0.2);
        border: 1px solid #7C3AED;
        color: #d8b4fe;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
        float: right;
    }
    
    /* Chat Messages */
    div[data-testid="stChatMessage"] {
        background-color: transparent;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: 1rem 0;
    }
    div[data-testid="chatAvatarIcon-user"] {
        background-color: #5E6AD2;
    }
    div[data-testid="chatAvatarIcon-assistant"] {
        background-color: #7C3AED;
    }
    </style>
    """, unsafe_allow_html=True)


@st.cache_resource
def load_app_engines():
    """Initialize DB engines."""
    engines = {
        "Qdrant": QdrantWrapper(),
        "Weaviate": WeaviateWrapper(),
        "Milvus": MilvusWrapper()
    }
    initialized_engines = {}
    for name, engine in engines.items():
        try:
            engine.connect()
            initialized_engines[name] = engine
            logger.info(f"Initialized {name}")
        except Exception as e:
            st.error(f"Failed to connect to {name}: {e}")
            logger.error(f"Failed to initialize {name}: {e}")
    return initialized_engines

@st.cache_resource
def get_embedder():
    return Embedder()

@st.cache_resource
def get_generator():
    return LLMGenerator()

def main():
    inject_custom_css()
    
    mock_html = "<span class='mock-badge'>MOCK MODE ON</span>" if MOCK_MODE else ""
    st.markdown(f"<h1>Vector DB Benchmark <span>{mock_html}</span></h1>", unsafe_allow_html=True)
    
    db_catalog = load_app_engines()
    embedder = get_embedder()
    generator = get_generator()
    
    # --- Sidebar ---
    with st.sidebar:
        st.header("Control Panel")
        available_dbs = list(db_catalog.keys())
        if not available_dbs:
            st.error("No Vector Databases available.")
            return
            
        selected_engine_name = st.selectbox("Active Database Engine", available_dbs)
        active_db = db_catalog[selected_engine_name]
        
        st.divider()
        st.subheader("Data Ingestion Pipeline")
        uploaded_file = st.file_uploader("Upload Document (PDF)", type=["pdf"])
        
        if uploaded_file is not None and active_db:
            if st.button("Process & Inject"):
                with st.spinner(f"Ingesting into {selected_engine_name}..."):
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                        tmp_file.write(uploaded_file.getvalue())
                        tmp_path = tmp_file.name
                    
                    try:
                        chunks = load_and_chunk_pdf(tmp_path)
                        if chunks:
                            embeddings = embedder.embed_documents(chunks)
                            active_db.insert(chunks, embeddings)
                            st.success(f"Ingested {len(chunks)} chunks!")
                        else:
                            st.error("Extraction failed.")
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)

        st.divider()
        st.subheader("Stress Test")
        num_rounds = st.slider("Rounds", min_value=1, max_value=20, value=3)
        if st.button("Run Stress Test"):
            progress_bar = st.progress(0)
            status_text = st.empty()

            def _progress(current, total, msg):
                progress_bar.progress(current / total)
                status_text.text(msg)

            with st.spinner("Running stress test across all databases..."):
                results = run_stress_test(
                    db_catalog, embedder,
                    num_rounds=num_rounds,
                    chunks_per_round=20,
                    progress_callback=_progress,
                )
            progress_bar.progress(1.0)
            status_text.text("Stress test complete.")

            for eng, stats in results.items():
                st.markdown(f"**{eng}:** Insert avg {stats['avg_insert_ms']:.1f}ms | Search avg {stats['avg_search_ms']:.1f}ms")

    # --- Main Chat Area ---
    if selected_engine_name:
        st.markdown(f"### RAG Agent ({selected_engine_name})")
        
        if "messages" not in st.session_state:
            st.session_state.messages = []

        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

        if prompt := st.chat_input("Query your Big Data knowledge base..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)
                
            with st.chat_message("assistant"):
                with st.spinner("Analyzing context..."):
                    query_vector = embedder.embed_query(prompt)
                    context_chunks = active_db.search(query_vector, top_k=5)
                    response = generator.generate(prompt, context_chunks, selected_engine_name)
                    st.markdown(response)
                
            st.session_state.messages.append({"role": "assistant", "content": response})

    st.markdown("<br>", unsafe_allow_html=True)
    
    # --- Benchmark Dashboard ---
    with st.expander("Performance Telemetry (Live)", expanded=True):
        if METRICS_FILE.exists():
            try:
                df = pd.read_csv(METRICS_FILE)
                if not df.empty:
                    c1, c2 = st.columns(2)
                    with c1:
                        fig_box = px.box(df, x="Engine", y="Duration_ms", color="Operation", 
                                       title="Latency Distribution (ms)")
                        fig_box.update_layout(template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                        st.plotly_chart(fig_box, use_container_width=True)
                    with c2:
                        avg_df = df.groupby(["Engine", "Operation"])["Duration_ms"].mean().reset_index()
                        fig_bar = px.bar(avg_df, x="Engine", y="Duration_ms", color="Operation", barmode="group", 
                                       title="Average Operational Latency")
                        fig_bar.update_layout(template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                        st.plotly_chart(fig_bar, use_container_width=True)
                else:
                    st.info("Awaiting telemetry data...")
            except Exception as e:
                st.error(f"Telemetry Error: {e}")
        else:
            st.info("Execute ingestion/search to generate telemetry.")

    # --- Resource Monitor ---
    with st.expander("System Resources (Docker Containers)", expanded=False):
        if st.button("Refresh Resource Stats"):
            with st.spinner("Querying Docker containers..."):
                res_df = get_all_stats()
            if not res_df.empty:
                r1, r2, r3 = st.columns(3)
                for idx, row in res_df.iterrows():
                    col = [r1, r2, r3][idx % 3]
                    with col:
                        st.markdown(f"**{row['engine']}**")
                        st.metric("CPU", f"{row['cpu_percent']:.1f}%")
                        st.metric("RAM", f"{row['mem_usage_mb']:.0f} MB / {row['mem_limit_mb']:.0f} MB")
            else:
                st.warning("No container data available. Ensure Docker is running.")
        else:
            st.info("Click 'Refresh Resource Stats' to view container metrics.")

if __name__ == "__main__":
    main()
