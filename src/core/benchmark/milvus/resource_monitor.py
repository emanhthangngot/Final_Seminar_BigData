"""
Resource Monitor -- collects real-time CPU and RAM metrics from Docker containers.

This module uses the Docker Python SDK to query container statistics for
each Vector Database (Qdrant, Weaviate, Milvus). The collected data is used
to populate the "System Resources" section of the Benchmark Dashboard,
fulfilling Metrics #3 (Resource Consumption) from first_plan.md.
"""

import time
import os
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
_DOCKER_SOCKET_MISSING_LOGGED = False
_DOCKER_UNAVAILABLE_WARNED = False


def _empty_stats_frame() -> pd.DataFrame:
    return pd.DataFrame(
        columns=["engine", "cpu_percent", "mem_usage_mb", "mem_limit_mb", "timestamp"]
    )


def _default_docker_socket_missing() -> bool:
    return not os.getenv("DOCKER_HOST") and not Path("/var/run/docker.sock").exists()


def _log_missing_docker_socket_once() -> None:
    global _DOCKER_SOCKET_MISSING_LOGGED
    if not _DOCKER_SOCKET_MISSING_LOGGED:
        logger.info(
            "[ResourceMonitor] Docker socket is not mounted; returning empty resource snapshot."
        )
        _DOCKER_SOCKET_MISSING_LOGGED = True


def _warn_docker_unavailable_once(message: str, *args) -> None:
    global _DOCKER_UNAVAILABLE_WARNED
    if not _DOCKER_UNAVAILABLE_WARNED:
        logger.warning(message, *args)
        _DOCKER_UNAVAILABLE_WARNED = True


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


def get_container_stats(engine_name: str, client=None) -> Optional[Dict]:
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

    close_client = client is None
    try:
        import docker
        if client is None:
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
    finally:
        if close_client and client is not None:
            close = getattr(client, "close", None)
            if callable(close):
                close()


def get_all_stats() -> pd.DataFrame:
    """
    Collect resource stats from all three database containers.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: engine, cpu_percent, mem_usage_mb, mem_limit_mb, timestamp.
        Rows for unreachable containers are omitted.
    """
    if _default_docker_socket_missing():
        _log_missing_docker_socket_once()
        return _empty_stats_frame()

    try:
        import docker
        client = docker.from_env()
    except Exception as exc:
        _warn_docker_unavailable_once("[ResourceMonitor] Docker daemon unavailable: %s", exc)
        return _empty_stats_frame()

    try:
        rows = []
        for name in CONTAINER_MAP:
            result = get_container_stats(name, client=client)
            if result:
                rows.append(result)

        if rows:
            return pd.DataFrame(rows)
        return _empty_stats_frame()
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
