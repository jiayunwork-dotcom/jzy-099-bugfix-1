"""逐步轨迹（trace）的构造工具。

前端不做任何计算，完全靠这里产出的步骤快照驱动动画：
每一步都携带完整的距离表、前驱表、已确定集合，
以及算法特有的信息（Dijkstra 的优先队列 / Bellman–Ford 的轮次）。
"""

from __future__ import annotations

import math

from .graph import Edge

# JSON 无法表示 ±∞：+∞（不可达）序列化为 None，
# -∞（因负权环导致最短路不存在）序列化为字符串 "-Infinity"。
NEG_INF = "-Infinity"


def snapshot_distances(
    dist: dict[str, float],
    neg_inf_nodes: set[str] | None = None,
) -> dict[str, float | str | None]:
    """math.inf 转 None（前端渲染为 ∞）；neg_inf_nodes 中的节点渲染为 −∞。

    最短距离因负权环而不存在的节点绝不允许以有限数出现在快照里。
    """
    neg_inf_nodes = neg_inf_nodes or set()
    return {
        n: (NEG_INF if n in neg_inf_nodes else (None if d == math.inf else d))
        for n, d in dist.items()
    }


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
    neg_inf_nodes: set[str] | None = None,
) -> dict:
    neg_inf_nodes = neg_inf_nodes or set()
    # 结论步骤里这些节点不再有有意义的前驱，避免前端照抄出一条经过 −∞ 的路径
    pred_view = {n: (None if n in neg_inf_nodes else p) for n, p in pred.items()}
    return {
        "kind": kind,
        "message": message,
        "edge": None if edge is None else {"u": edge.u, "v": edge.v, "w": edge.w},
        "relaxed": relaxed,
        "distances": snapshot_distances(dist, neg_inf_nodes),
        "predecessors": pred_view,
        "settled": list(settled),
        "queue": queue,
        "round": round_,
        "negativeInfinity": sorted(neg_inf_nodes),
    }


def fmt(d: float) -> str:
    """消息里的距离格式化：∞ 或去掉多余的 .0。"""
    if d == math.inf:
        return "∞"
    return f"{d:g}"
