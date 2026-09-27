"""逐步轨迹（trace）的构造工具。

前端不做任何计算，完全靠这里产出的步骤快照驱动动画：
每一步都携带完整的距离表、前驱表、已确定集合，
以及算法特有的信息（Dijkstra 的优先队列 / Bellman–Ford 的轮次）。
"""

from __future__ import annotations

import math

from .graph import Edge


def snapshot_distances(dist: dict[str, float]) -> dict[str, float | None]:
    """math.inf 在 JSON 里无法表示，统一转成 None（前端渲染为 ∞）。"""
    return {n: (None if d == math.inf else d) for n, d in dist.items()}


def make_step(
    kind: str,
    message: str,
    dist: dict[str, float],
    pred: dict[str, str | None],
    settled: list[str],
    *,
    edge: Edge | None = None,
    relaxed: bool = False,
    queue: list[dict] | None = None,
    round_: int | None = None,
) -> dict:
    return {
        "kind": kind,
        "message": message,
        "edge": None if edge is None else {"u": edge.u, "v": edge.v, "w": edge.w},
        "relaxed": relaxed,
        "distances": snapshot_distances(dist),
        "predecessors": dict(pred),
        "settled": list(settled),
        "queue": queue,
        "round": round_,
    }


def fmt(d: float) -> str:
    """消息里的距离格式化：∞ 或去掉多余的 .0。"""
    if d == math.inf:
        return "∞"
    return f"{d:g}"
