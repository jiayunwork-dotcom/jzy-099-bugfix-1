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
    unbounded: list[str] | None = None,
) -> dict:
    """构造一步快照。

    unbounded 给出「最短距离为 −∞」的节点：只在检测到负权环的最后一步
    传入，这些节点的距离序列化为 null 并额外放进 unbounded_nodes，
    让前端能把「−∞ / 不存在」与「不可达的 ∞」区分开。其余步骤一律不传，
    逐轮松弛过程里的中间距离保持原样。
    """
    unbounded_set = set(unbounded or [])
    return {
        "kind": kind,
        "message": message,
        "edge": None if edge is None else {"u": edge.u, "v": edge.v, "w": edge.w},
        "relaxed": relaxed,
        "distances": {
            n: (None if n in unbounded_set or d == math.inf else d)
            for n, d in dist.items()
        },
        "predecessors": dict(pred),
        "settled": list(settled),
        "queue": queue,
        "round": round_,
        "unbounded_nodes": list(unbounded) if unbounded is not None else None,
    }


def fmt(d: float) -> str:
    """消息里的距离格式化：∞ 或去掉多余的 .0。"""
    if d == math.inf:
        return "∞"
    return f"{d:g}"
