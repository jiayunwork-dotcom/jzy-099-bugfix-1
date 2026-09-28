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


def find_unbounded_nodes(
    graph: Graph,
    dist: dict[str, float],
) -> list[str]:
    """找出最短距离因负权环而不存在（为 -∞）的全部节点。

    做完 |V|-1 轮松弛后，任何简单路径都已被考察过：此时若边 u→v 仍可松弛，
    说明 v 可以经由某个从源点可达的负权环把距离继续压小。从这些节点出发沿
    出边传播（绕环次数越多，能被压低的节点也一路扩散），最终得到的恰好是
    「环上节点 + 从环上可达的全部下游节点」，例如环下游、自身不在环上的点。

    用反复扫描到不动点的方式做传播，与边的排列顺序无关，也不会漏掉
    在单次扫描中尚未轮到松弛的环上节点。按 graph.nodes 的顺序返回。
    """
    unbounded: set[str] = set()
    changed = True
    while changed:
        changed = False
        for e in graph.edges:
            if e.v in unbounded:
                continue
            relaxable = dist[e.u] != math.inf and dist[e.u] + e.w < dist[e.v]
            if relaxable or e.u in unbounded:
                unbounded.add(e.v)
                changed = True
    return [n for n in graph.nodes if n in unbounded]
