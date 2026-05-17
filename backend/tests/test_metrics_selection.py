import tempfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers.metrics import select_metrics_file


def write_csv(path: Path, rows: list[str]) -> Path:
    path.write_text("Timestamp,Engine,Operation,Duration_ms\n" + "\n".join(rows) + "\n")
    return path


def test_select_metrics_file_skips_load_only_runtime_metrics():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        runtime = write_csv(root / "runtime.csv", ["2026-05-17T16:15:24.907,Milvus,load,4.494"])
        snapshot = write_csv(root / "snapshot.csv", [
            "2026-05-06T18:48:28.707,Milvus,search,2.465",
            "2026-05-06T18:48:28.707,Qdrant,search,4.570",
            "2026-05-06T18:48:28.707,Weaviate,search,16.190",
        ])

        assert select_metrics_file([runtime, snapshot]) == snapshot


if __name__ == "__main__":
    test_select_metrics_file_skips_load_only_runtime_metrics()
