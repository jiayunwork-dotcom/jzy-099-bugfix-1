"""API 请求模型与输入校验。

所有非法输入（引用不存在的节点、重复边、自环、非法源点等）
都在这里被拒绝，并带有具体中文原因。
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator


class EdgeIn(BaseModel):
    u: str
    v: str
    w: float


class GraphIn(BaseModel):
    nodes: list[str]
    edges: list[EdgeIn]

    @model_validator(mode="after")
    def _check_graph(self) -> "GraphIn":
        if not self.nodes:
            raise ValueError("图中至少需要一个节点")
        if len(set(self.nodes)) != len(self.nodes):
            raise ValueError("节点 id 存在重复")
        node_set = set(self.nodes)
        seen: set[tuple[str, str]] = set()
        for e in self.edges:
            if e.u not in node_set or e.v not in node_set:
                raise ValueError(f"边 {e.u}→{e.v} 引用了不存在的节点")
            if e.u == e.v:
                raise ValueError(f"不支持自环边 {e.u}→{e.v}")
            if (e.u, e.v) in seen:
                raise ValueError(f"边 {e.u}→{e.v} 被重复定义")
            seen.add((e.u, e.v))
        return self


class RunRequest(BaseModel):
    graph: GraphIn
    source: str
    algorithm: Literal["dijkstra", "bellman-ford"]

    @model_validator(mode="after")
    def _check_source(self) -> "RunRequest":
        if self.source not in set(self.graph.nodes):
            raise ValueError(f"源点 {self.source} 不在图中")
        return self
