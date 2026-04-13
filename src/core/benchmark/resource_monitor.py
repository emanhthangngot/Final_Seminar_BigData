"""
Resource Monitor -- collects real-time CPU and RAM metrics from Docker containers.

This module uses the Docker Python SDK to query container statistics for
each Vector Database (Qdrant, Weaviate, Milvus). The collected data is used
to populate the "System Resources" section of the Benchmark Dashboard,
fulfilling Metrics #3 (Resource Consumption) from first_plan.md.
"""

import time
import pandas as pd
from pathlib import Path
from typing import Dict, Optional
from src.core.utils.logger import logger
from src.config import METRICS_FILE

# Container name mapping (must match docker-compose.yml container_name values)
CONTAINER_MAP = {
    "Qdrant": "seminar_qdrant",
    "Weaviate": "seminar_weaviate",
    "Milvus": "seminar_milvus",
}


def _calculate_cpu_percent(stats: dict) -> float:
    """Calculate CPU usage percentage from Docker stats JSON."""
    try:
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = (
            stats["cpu_stats"]["system_cpu_usage"]
            - stats["precpu_stats"]["system_cpu_usage"]
        )
        num_cpus = stats["cpu_stats"].get("online_cpus", 1)
        if system_delta > 0 and cpu_delta >= 0:
            return round((cpu_delta / system_delta) * num_cpus * 100.0, 2)
    except (KeyError, TypeError, ZeroDivisionError):
        pass
    return 0.0


def _calculate_mem_usage_mb(stats: dict) -> float:
    """Extract memory usage in MB from Docker stats JSON."""
    try:
        usage = stats["memory_stats"]["usage"]
        cache = stats["memory_stats"].get("stats", {}).get("cache", 0)
        return round((usage - cache) / (1024 * 1024), 2)
    except (KeyError, TypeError):
        return 0.0


def _calculate_mem_limit_mb(stats: dict) -> float:
    """Extract memory limit in MB from Docker stats JSON."""
    try:
        return round(stats["memory_stats"]["limit"] / (1024 * 1024), 2)
    except (KeyError, TypeError):
        return 0.0


def get_container_stats(engine_name: str) -> Optional[Dict]:
    """
    Retrieve real-time resource statistics for a single container.

    Parameters
    ----------
    engine_name : str
        One of "Qdrant", "Weaviate", "Milvus".

    Returns
    -------
    dict or None
        Dictionary with keys: engine, cpu_percent, mem_usage_mb, mem_limit_mb, timestamp.
        Returns None if the container is unreachable.
    """
    container_name = CONTAINER_MAP.get(engine_name)
    if not container_name:
        return None

    try:
        import docker
        client = docker.from_env()
        container = client.containers.get(container_name)
        stats = container.stats(stream=False)

        return {
            "engine": engine_name,
            "cpu_percent": _calculate_cpu_percent(stats),
            "mem_usage_mb": _calculate_mem_usage_mb(stats),
            "mem_limit_mb": _calculate_mem_limit_mb(stats),
            "timestamp": pd.Timestamp.now(),
        }
    except Exception as exc:
        logger.warning(
            "[ResourceMonitor] Failed to get stats for %s (%s): %s",
            engine_name, container_name, exc,
        )
        return None


def get_all_stats() -> pd.DataFrame:
    """
    Collect resource stats from all three database containers.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: engine, cpu_percent, mem_usage_mb, mem_limit_mb, timestamp.
        Rows for unreachable containers are omitted.
    """
    rows = []
    for name in CONTAINER_MAP:
        result = get_container_stats(name)
        if result:
            rows.append(result)

    if rows:
        return pd.DataFrame(rows)
    return pd.DataFrame(
        columns=["engine", "cpu_percent", "mem_usage_mb", "mem_limit_mb", "timestamp"]
    )
