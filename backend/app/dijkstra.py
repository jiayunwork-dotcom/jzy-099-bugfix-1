"""Dijkstra 单源最短路（仅适用于非负权图）。

正确性约定：
- 图中只要存在负权边，立即抛出 NegativeWeightError 拒绝计算，
  而不是悄悄给出可能错误的距离。
- 返回逐步轨迹：初始化、取出堆顶（确定节点）、每条边的松弛尝试、
  过期堆项的跳过，以及结束步骤。
"""

from __future__ import annotations

import heapq
import math

from .errors import NegativeWeightError
from .graph import Graph
from .trace import fmt, make_step


def dijkstra(graph: Graph, source: str) -> tuple[list[dict], dict[str, float], dict[str, str | None]]:
    neg = [e for e in graph.edges if e.w < 0]
    if neg:
        e = neg[0]
        raise NegativeWeightError(
            f"图中存在负权边 {e.u}→{e.v}（权重 {e.w:g}），"
            "Dijkstra 无法保证结果正确，已拒绝计算；请改用 Bellman–Ford"
        )

    dist = {n: math.inf for n in graph.nodes}
    pred: dict[str, str | None] = {n: None for n in graph.nodes}
    dist[source] = 0.0
    settled: list[str] = []
    settled_set: set[str] = set()
    heap: list[tuple[float, str]] = [(0.0, source)]

    def queue_snapshot() -> list[dict]:
        entries = [(d, n) for d, n in heap if n not in settled_set]
        entries.sort()
        return [{"node": n, "dist": d} for d, n in entries]

    steps: list[dict] = [
        make_step(
            "init",
            f"初始化：dist({source}) = 0，其余节点为 ∞，源点入优先队列",
            dist, pred, settled, queue=queue_snapshot(),
        )
    ]

    while heap:
        d, u = heapq.heappop(heap)
        if u in settled_set:
            steps.append(
                make_step(
                    "skip",
                    f"堆顶节点 {u} 已确定过最短距离，丢弃该过期堆项",
                    dist, pred, settled, queue=queue_snapshot(),
                )
            )
            continue
        settled.append(u)
        settled_set.add(u)
        steps.append(
            make_step(
                "visit",
                f"取出队列中距离最小的节点 {u}（dist = {fmt(d)}），其最短距离已确定",
                dist, pred, settled, queue=queue_snapshot(),
            )
        )
        for e in graph.adj[u]:
            cand = dist[u] + e.w
            if cand < dist[e.v]:
                old = dist[e.v]
                dist[e.v] = cand
                pred[e.v] = u
                heapq.heappush(heap, (cand, e.v))
                steps.append(
                    make_step(
                        "relax",
                        f"松弛边 {e.u}→{e.v}：dist({e.v}) 从 {fmt(old)} 更新为 "
                        f"{fmt(cand)}，{e.v} 入队",
                        dist, pred, settled,
                        edge=e, relaxed=True, queue=queue_snapshot(),
                    )
                )
            else:
                steps.append(
                    make_step(
                        "relax",
                        f"边 {e.u}→{e.v} 松弛失败：dist({e.u}) + {e.w:g} = "
                        f"{fmt(cand)} ≥ dist({e.v}) = {fmt(dist[e.v])}",
                        dist, pred, settled,
                        edge=e, relaxed=False, queue=queue_snapshot(),
                    )
                )

    steps.append(
        make_step(
            "done",
            "算法结束：所有已确定节点的距离即为最短距离，仍为 ∞ 的节点不可达",
            dist, pred, settled, queue=[],
        )
    )
    return steps, dist, pred
