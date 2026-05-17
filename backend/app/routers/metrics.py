import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from fastapi import APIRouter
import pandas as pd
from config import BENCHMARK_DIR, FRONTEND_BENCHMARK_DATA_DIR, METRICS_FILE

router = APIRouter()


def _has_search_samples(path):
    if not path.exists():
        return False
    try:
        df = pd.read_csv(path, usecols=["Engine", "Operation"])
    except (ValueError, pd.errors.EmptyDataError):
        return False

    search_df = df[df["Operation"] == "search"]
    return len(search_df) > 0 and search_df["Engine"].nunique() >= 2


def select_metrics_file(candidates):
    existing = [path for path in candidates if path.exists()]
    if not existing:
        return None

    for path in existing:
        if _has_search_samples(path):
            return path

    return existing[0]


@router.get("/metrics")
def get_metrics():
    snapshot_file = FRONTEND_BENCHMARK_DATA_DIR / "combined" / "metrics.csv"
    bundled_file = BENCHMARK_DIR / "weaviate" / "metrics.csv"
    metrics_file = select_metrics_file([METRICS_FILE, snapshot_file, bundled_file])

    if metrics_file is None:
        return []
    df = pd.read_csv(metrics_file)
    return df.to_dict(orient="records")


@router.delete("/metrics")
def clear_metrics():
    if METRICS_FILE.exists():
        METRICS_FILE.unlink()
    return {"cleared": True}
