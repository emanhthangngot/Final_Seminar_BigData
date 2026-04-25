import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parents[3]))

from fastapi import APIRouter
from core.utils.dx_analyzer import analyze_dx

router = APIRouter()


@router.get("/dx")
def get_dx():
    return analyze_dx()
