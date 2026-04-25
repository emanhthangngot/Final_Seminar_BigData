import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from fastapi import APIRouter
import pandas as pd
from config import METRICS_FILE

router = APIRouter()


@router.get("/metrics")
def get_metrics():
    if not METRICS_FILE.exists():
        return []
    df = pd.read_csv(METRICS_FILE)
    return df.to_dict(orient="records")


@router.delete("/metrics")
def clear_metrics():
    if METRICS_FILE.exists():
        METRICS_FILE.unlink()
    return {"cleared": True}
