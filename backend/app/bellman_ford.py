"""Bellman–Ford 单源最短路（支持负权边，可识别负权环）。

正确性约定：
- 最多进行 |V|-1 轮「对所有边松弛」；某一轮没有任何松弛则提前结束。
- 之后若仍存在可松弛的边，说明从源点可达负权环：
  返回的 dist / pred 为 None，绝不把被负权环污染的距离当作结果交出去，
  同时给出环上的节点序列。
"""

from __future__ import annotations

import math

from .graph import Graph
from .negative_cycle import find_negative_cycle
from .trace import fmt, make_step


def bellman_ford(
    graph: Graph, source: str
) -> tuple[list[dict], dict[str, float] | None, dict[str, str | None] | None, list[str] | None]:
    dist = {n: math.inf for n in graph.nodes}
    pred: dict[str, str | None] = {n: None for n in graph.nodes}
    dist[source] = 0.0
    settled: list[str] = []  # Bellman–Ford 没有「已确定」集合，保持为空

    n = len(graph.nodes)
    max_rounds = max(n - 1, 0)

    steps: list[dict] = [
        make_step(
            "init",
            f"初始化：dist({source}) = 0，其余节点为 ∞；"
            f"最多进行 |V|-1 = {max_rounds} 轮松弛",
            dist, pred, settled, round_=0,
        )
    ]

    for round_ in range(1, max_rounds + 1):
        steps.append(
            make_step(
                "round",
                f"—— 第 {round_} 轮：依次尝试松弛所有边 ——",
                dist, pred, settled, round_=round_,
            )
        )
        changed = False
        for e in graph.edges:
            if dist[e.u] == math.inf:
                steps.append(
                    make_step(
                        "skip",
                        f"边 {e.u}→{e.v}：{e.u} 当前不可达（∞），跳过",
                        dist, pred, settled, edge=e, relaxed=False, round_=round_,
                    )
                )
                continue
            cand = dist[e.u] + e.w
            if cand < dist[e.v]:
                old = dist[e.v]
                dist[e.v] = cand
                pred[e.v] = e.u
                changed = True
                steps.append(
                    make_step(
                        "relax",
                        f"松弛边 {e.u}→{e.v}：dist({e.v}) 从 {fmt(old)} 更新为 {fmt(cand)}",
                        dist, pred, settled, edge=e, relaxed=True, round_=round_,
                    )
                )
            else:
                steps.append(
                    make_step(
                        "relax",
                        f"边 {e.u}→{e.v} 无需松弛：dist({e.u}) + {e.w:g} = "
                        f"{fmt(cand)} ≥ dist({e.v}) = {fmt(dist[e.v])}",
                        dist, pred, settled, edge=e, relaxed=False, round_=round_,
                    )
                )
        if not changed:
            steps.append(
                make_step(
                    "early-stop",
                    f"第 {round_} 轮没有任何松弛发生，距离已收敛，提前结束",
                    dist, pred, settled, round_=round_,
                )
            )
            break

    cycle = find_negative_cycle(graph, dist, pred)
    if cycle is not None:
        steps.append(
            make_step(
                "cycle",
                f"第 {n} 轮仍存在可松弛的边 → 检测到从源点可达的负权环："
                f"{' → '.join(cycle)}。存在负权环，最短路不存在",
                dist, pred, settled, round_=n,
            )
        )
        return steps, None, None, cycle

    steps.append(
        make_step(
            "done",
            "松弛完成且未检测到负权环，距离表即为各节点最短距离",
            dist, pred, settled, round_=max_rounds,
        )
    )
    return steps, dist, pred, None
