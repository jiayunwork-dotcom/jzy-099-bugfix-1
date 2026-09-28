"""负权环检测。

在 Bellman–Ford 完成 |V|-1 轮松弛之后，若仍有边可以松弛，
则从源点可达的范围内存在负权环。此时通过前驱指针回溯
（先走 |V| 步保证进入环内，再绕环一周）把环上的节点序列找出来，
供前端高亮。返回形如 [B, C, D, B] 的节点序列（首尾相同），
不存在负权环时返回 None。
"""

from __future__ import annotations

import math

from .graph import Graph


def _relaxable_heads(
    graph: Graph, dist: dict[str, float]
) -> set[str]:
    """|V|-1 轮之后仍可松弛的边的终点集合。"""
    heads: set[str] = set()
    for e in graph.edges:
        if dist[e.u] != math.inf and dist[e.u] + e.w < dist[e.v]:
            heads.add(e.v)
    return heads


def find_negative_cycle(
    graph: Graph,
    dist: dict[str, float],
    pred: dict[str, str | None],
) -> list[str] | None:
    heads = _relaxable_heads(graph, dist)
    if not heads:
        return None
    x = next(iter(heads))

    # 沿前驱走 |V| 步，必然落在环上
    y = x
    for _ in range(len(graph.nodes)):
        nxt = pred[y]
        if nxt is None:  # 防御：理论上不会发生
            return None
        y = nxt

    # 绕环一周收集节点
    cycle = [y]
    cur = pred[y]
    while cur is not None and cur != y:
        cycle.append(cur)
        cur = pred[cur]
    cycle.append(y)
    cycle.reverse()
    return cycle


def find_unbounded_nodes(
    graph: Graph, dist: dict[str, float]
) -> list[str] | None:
    """最短距离为 −∞（因从源点可达的负权环而不存在）的全部节点。

    |V|-1 轮后仍可松弛的边，其终点的最短路不存在；从这些节点出发
    沿有向边能走到的所有节点，最短路同样不存在（可以先绕环任意多圈
    再过去）。按 graph.nodes 的顺序返回，保证输出稳定可测。
    不存在可达负权环时返回 None。
    """
    seeds = _relaxable_heads(graph, dist)
    if not seeds:
        return None

    unbounded: set[str] = set(seeds)
    stack = list(seeds)
    while stack:
        u = stack.pop()
        for e in graph.adj[u]:
            if e.v not in unbounded:
                unbounded.add(e.v)
                stack.append(e.v)
    return [n for n in graph.nodes if n in unbounded]


def cycle_weight(graph: Graph, cycle: list[str]) -> float:
    """环的总权重（测试与校验用）。"""
    w = 0.0
    table = {(e.u, e.v): e.w for e in graph.edges}
    for a, b in zip(cycle, cycle[1:]):
        w += table[(a, b)]
    return w
