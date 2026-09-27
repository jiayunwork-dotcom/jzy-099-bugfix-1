"""图模型：带权有向图。

只负责存储结构与邻接表，不含任何算法逻辑。
距离在算法内部用 math.inf 表示「无穷大 / 不可达」，
仅在 API 边界处序列化为 JSON 的 null。
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Edge:
    u: str  # 起点节点 id
    v: str  # 终点节点 id
    w: float  # 权重，允许为负


@dataclass
class Graph:
    nodes: list[str]
    edges: list[Edge]
    adj: dict[str, list[Edge]] = field(init=False)

    def __post_init__(self) -> None:
        self.adj = {n: [] for n in self.nodes}
        for e in self.edges:
            self.adj[e.u].append(e)

    @classmethod
    def from_pairs(
        cls, nodes: list[str], edges: list[tuple[str, str, float]]
    ) -> "Graph":
        return cls(nodes=list(nodes), edges=[Edge(u, v, w) for u, v, w in edges])
