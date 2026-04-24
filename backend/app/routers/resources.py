import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from fastapi import APIRouter
from core.benchmark.resource_monitor import get_all_stats

router = APIRouter()


@router.get("/resources")
def get_resources():
    df = get_all_stats()
    if df.empty:
        return []
    return df.to_dict(orient="records")
