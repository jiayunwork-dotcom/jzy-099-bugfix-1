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


def find_negative_cycle(
    graph: Graph,
    dist: dict[str, float],
    pred: dict[str, str | None],
) -> list[str] | None:
    x: str | None = None
    for e in graph.edges:
        if dist[e.u] != math.inf and dist[e.u] + e.w < dist[e.v]:
            x = e.v
            break
    if x is None:
        return None

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


def cycle_weight(graph: Graph, cycle: list[str]) -> float:
    """环的总权重（测试与校验用）。"""
    w = 0.0
    table = {(e.u, e.v): e.w for e in graph.edges}
    for a, b in zip(cycle, cycle[1:]):
        w += table[(a, b)]
    return w
