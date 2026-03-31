import time
import csv
import os
from functools import wraps

METRICS_FILE = "src/benchmark/metrics.csv"

def init_metrics_file():
    """Initializes the CSV metrics log file if it does not exist"""
    if not os.path.exists(METRICS_FILE):
        os.makedirs(os.path.dirname(METRICS_FILE), exist_ok=True)
        with open(METRICS_FILE, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Engine", "Ingestion_Time_ms", "Query_Latency_ms"])

def time_profiler(metric_name: str, engine_name: str):
    """
    Decorator to profile the execution latency of a function in milliseconds.
    Apply this decorator to the 'insert' or 'search' functions inside the DB Clients.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            end = time.perf_counter()
            
            elapsed_ms = (end - start) * 1000
            print(f"[{engine_name}] Execution of '{metric_name}' took {elapsed_ms:.2f} ms")
            
            # The logic to append to the CSV file will be pipelined here subsequently
            return result
        return wrapper
    return decorator

# Proactively initialize metrics log upon import
init_metrics_file()
