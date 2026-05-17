"""
LLM Response Generator -- produces answers from retrieved context.

When MOCK_MODE is active the generator returns a structured synthetic
response that mirrors what a real LLM would output.  This includes a
simulated "thinking delay" so the UI progress spinner behaves naturally.
"""

import time
import textwrap
from typing import List, Optional

from src.config import MOCK_MODE, OLLAMA_BASE_URL, LLM_MODEL
from src.core.utils.logger import logger


class LLMGenerator:
    """Unified LLM generation interface for Ollama or explicit mock mode."""

    # The system prompt instructs the LLM to be a domain-specific assistant.
    SYSTEM_PROMPT = textwrap.dedent("""\
        You are a knowledgeable assistant specialised in Big Data technologies,
        specifically Vector Databases (Qdrant, Weaviate, Milvus).  Answer the
        user's question using ONLY the provided context.  If the context does
        not contain the answer, say so explicitly.  Always cite which part of
        the context supports your answer.  Use clear, concise Vietnamese or
        English depending on the user's language.
    """).strip()

    def __init__(self):
        self._llm = None

        if MOCK_MODE:
            logger.info("[LLMGenerator] MOCK_MODE is active. Using synthetic responses.")
        else:
            try:
                from langchain_community.llms import Ollama
                self._llm = Ollama(
                    base_url=OLLAMA_BASE_URL,
                    model=LLM_MODEL,
                    temperature=0.3,
                )
                logger.info(
                    "[LLMGenerator] Connected to Ollama LLM at %s with model %s",
                    OLLAMA_BASE_URL, LLM_MODEL,
                )
            except Exception as exc:
                message = (
                    f"[LLMGenerator] Failed to initialise Ollama LLM at "
                    f"{OLLAMA_BASE_URL} with model {LLM_MODEL}: {exc}"
                )
                logger.error(message)
                raise RuntimeError(message) from exc

    # ------------------------------------------------------------------
    # Mock response
    # ------------------------------------------------------------------
    @staticmethod
    def _mock_response(query: str, context_chunks: List[str]) -> str:
        """Build a structured mock answer that looks realistic."""
        # Simulate a short thinking delay (200-400 ms)
        time.sleep(0.25)

        if not context_chunks:
            return (
                "No relevant context was found in the database for your query. "
                "Please try uploading a document first or rephrase your question."
            )

        # Take the first few chunks as "evidence"
        preview = context_chunks[0][:300] if context_chunks else ""
        num = len(context_chunks)

        return textwrap.dedent(f"""\
**[Mock LLM Response -- MOCK_MODE is ON]**

**Query:** {query}

**Retrieved Context:** {num} chunk(s) found.

**Answer (simulated):**
Based on the retrieved context, the system found {num} relevant passage(s).
Below is a representative excerpt from the top-ranked passage:

> {preview}...

This mock response is generated deterministically.  Once a live Ollama
model (e.g. `{LLM_MODEL}`) is configured and `MOCK_MODE` is set to
`false`, this placeholder will be replaced by genuine LLM-generated
answers grounded in the retrieved context.
        """).strip()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate(
        self,
        query: str,
        context_chunks: List[str],
        db_name: Optional[str] = None,
    ) -> str:
        """
        Generate an answer for *query* given retrieved *context_chunks*.

        Parameters
        ----------
        query : str
            The user's natural-language question.
        context_chunks : List[str]
            Text passages retrieved from the vector database.
        db_name : str, optional
            Name of the database engine used (for logging / display).

        Returns
        -------
        str
            The generated answer (real or mock).
        """
        if self._llm is not None:
            # Build prompt
            context_block = "\n---\n".join(context_chunks)
            full_prompt = (
                f"{self.SYSTEM_PROMPT}\n\n"
                f"### Context:\n{context_block}\n\n"
                f"### Question:\n{query}\n\n"
                f"### Answer:"
            )
            try:
                answer = self._llm.invoke(full_prompt)
                logger.info("[LLMGenerator] Live response generated via %s", LLM_MODEL)
                return answer
            except Exception as exc:
                message = f"[LLMGenerator] Live generation failed via {LLM_MODEL}: {exc}"
                logger.error(message)
                raise RuntimeError(message) from exc
        else:
            return self._mock_response(query, context_chunks)
