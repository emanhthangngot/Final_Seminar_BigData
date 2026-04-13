"""
Developer Experience (DX) analyzer.

Beyond raw SLOC, we also compute a simple McCabe-style cyclomatic
complexity (count of decision points: if / for / while / except / with /
boolean ops / ternary) and count public methods + third-party imports.
The final score combines these signals — lower is friendlier DX.

The analyzer is static (AST-only) so it runs offline in CI without needing
the three DB SDKs installed.
"""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Dict

from src.config import SRC_DIR


CLIENT_FILES = {
    "Qdrant": SRC_DIR / "core" / "db_clients" / "qdrant.py",
    "Weaviate": SRC_DIR / "core" / "db_clients" / "weaviate.py",
    "Milvus": SRC_DIR / "core" / "db_clients" / "milvus.py",
}


_BRANCH_NODES = (
    ast.If, ast.For, ast.AsyncFor, ast.While,
    ast.ExceptHandler, ast.With, ast.AsyncWith,
    ast.IfExp, ast.BoolOp, ast.comprehension,
)


def _cyclomatic(tree: ast.AST) -> int:
    """Approximate McCabe complexity: 1 + number of branch-like nodes."""
    count = 1
    for node in ast.walk(tree):
        if isinstance(node, _BRANCH_NODES):
            count += 1
    return count


def _count_public_methods(tree: ast.AST) -> int:
    n = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and "Wrapper" in node.name:
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and not item.name.startswith("_"):
                    n += 1
            break
    return n


def _count_third_party_imports(tree: ast.AST) -> int:
    stdlib_hint = {"os", "sys", "typing", "pathlib", "re", "time", "uuid", "ast", "abc"}
    n = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if root not in stdlib_hint and root != "src":
                    n += 1
        elif isinstance(node, ast.ImportFrom) and node.module:
            root = node.module.split(".")[0]
            if root not in stdlib_hint and root != "src":
                n += 1
    return n


def _sloc(content: str) -> int:
    return sum(1 for line in content.splitlines() if line.strip() and not line.strip().startswith("#"))


def analyze_dx() -> Dict[str, Dict]:
    """
    Analyse every DB wrapper and return a DX report.

    Complexity score weights (lower = better DX):
        score = sloc * 0.5 + methods * 4 + cyclomatic * 2 + third_party_imports * 3
    """
    results: Dict[str, Dict] = {}
    for engine, path in CLIENT_FILES.items():
        if not path.exists():
            results[engine] = {
                "sloc": 0, "methods": 0, "cyclomatic": 0,
                "third_party_imports": 0, "complexity_score": 0,
                "status": "Missing File",
            }
            continue

        content = Path(path).read_text(encoding="utf-8")
        sloc = _sloc(content)

        try:
            tree = ast.parse(content)
            methods = _count_public_methods(tree)
            cyclomatic = _cyclomatic(tree)
            imports = _count_third_party_imports(tree)
            status = "OK"
        except SyntaxError as exc:
            methods = cyclomatic = imports = 0
            status = f"ParseError: {exc}"

        score = sloc * 0.5 + methods * 4 + cyclomatic * 2 + imports * 3
        results[engine] = {
            "sloc": sloc,
            "methods": methods,
            "cyclomatic": cyclomatic,
            "third_party_imports": imports,
            "complexity_score": round(score, 1),
            "status": status,
        }
    return results


if __name__ == "__main__":
    import pprint
    pprint.pprint(analyze_dx())
