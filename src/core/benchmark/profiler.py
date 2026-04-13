"""
Telemetry profiler — wraps DB client methods to capture latency and
stream it into a CSV ledger used by the Streamlit dashboard.

Design notes:
- Writes use append-mode (`a`) so a stress test of N operations costs O(N),
  not O(N²). The earlier implementation re-read and re-wrote the whole file
  on every call, which made long stress runs unusable.
- The parent directory is created lazily on first write so the module works
  on a fresh checkout without needing a pre-existing `benchmark/` folder.
"""

import csv
import functools
import threading
import time
from datetime import datetime

from src.config import METRICS_FILE
from src.core.utils.logger import logger

_CSV_HEADER = ["Timestamp", "Engine", "Operation", "Duration_ms"]
_write_lock = threading.Lock()


def _ensure_metrics_file() -> None:
    """Create the metrics file with header if it does not exist."""
    METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not METRICS_FILE.exists() or METRICS_FILE.stat().st_size == 0:
        with open(METRICS_FILE, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(_CSV_HEADER)


def log_metrics(engine: str, operation: str, duration_ms: float) -> None:
    """Append a single telemetry row to the metrics ledger (thread-safe)."""
    with _write_lock:
        _ensure_metrics_file()
        with open(METRICS_FILE, "a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(
                [datetime.now().isoformat(timespec="milliseconds"), engine, operation, f"{duration_ms:.3f}"]
            )


def time_profiler(func):
    """Decorator: measure wall-clock latency of a DB wrapper method."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        engine_name = args[0].__class__.__name__.replace("Wrapper", "") if args else "Unknown"

        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            log_metrics(engine_name, func.__name__, duration_ms)
            logger.info(f"[{engine_name}] {func.__name__} took {duration_ms:.2f} ms")

    return wrapper
