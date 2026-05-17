import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from fastapi import APIRouter
import pandas as pd
from config import BENCHMARK_DIR, FRONTEND_BENCHMARK_DATA_DIR, METRICS_FILE

router = APIRouter()


@router.get("/metrics")
def get_metrics():
    metrics_file = METRICS_FILE
    snapshot_file = FRONTEND_BENCHMARK_DATA_DIR / "combined" / "metrics.csv"
    if not metrics_file.exists() and snapshot_file.exists():
        metrics_file = snapshot_file
    elif not metrics_file.exists() and (BENCHMARK_DIR / "weaviate" / "metrics.csv").exists():
        metrics_file = BENCHMARK_DIR / "weaviate" / "metrics.csv"

    if not metrics_file.exists():
        return []
    df = pd.read_csv(metrics_file)
    return df.to_dict(orient="records")


@router.delete("/metrics")
def clear_metrics():
    if METRICS_FILE.exists():
        METRICS_FILE.unlink()
    return {"cleared": True}
