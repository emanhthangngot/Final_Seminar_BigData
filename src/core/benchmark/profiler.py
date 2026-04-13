import time
import functools
import pandas as pd
from pathlib import Path
from src.core.utils.logger import logger
from src.config import METRICS_FILE

def time_profiler(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # We assume the first argument is 'self' of a DB client
        # or we try to get the engine name from the class
        engine_name = args[0].__class__.__name__.replace("Wrapper", "")
        
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        
        duration_ms = (end_time - start_time) * 1000
        
        # Log to file
        log_metrics(engine_name, func.__name__, duration_ms)
        
        logger.info(f"[{engine_name}] {func.__name__} took {duration_ms:.2f} ms")
        return result
    return wrapper

def log_metrics(engine: str, operation: str, duration: float):
    # Ensure metrics file exists with headers
    if not METRICS_FILE.exists():
        df = pd.DataFrame(columns=["Timestamp", "Engine", "Operation", "Duration_ms"])
        df.to_csv(METRICS_FILE, index=False)
    
    new_entry = {
        "Timestamp": pd.Timestamp.now(),
        "Engine": engine,
        "Operation": operation,
        "Duration_ms": duration
    }
    
    df = pd.read_csv(METRICS_FILE)
    df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
    df.to_csv(METRICS_FILE, index=False)
