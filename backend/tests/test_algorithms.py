"""算法正确性测试。

主线一：无负权边时，Dijkstra 与 Bellman–Ford 给出的各节点最短距离完全一致。
主线二：存在从源点可达的负权环时，必须如实识别，绝不返回有限距离。
外加单调性、源点零距离、不可达为 ∞、Dijkstra 拒绝负权等不变量。
"""

from __future__ import annotations

import math
import random

import pytest

from app.bellman_ford import bellman_ford
from app.dijkstra import dijkstra
from app.errors import NegativeWeightError
from app.graph import Edge, Graph
from app.negative_cycle import cycle_weight
from app.path_reconstruction import build_paths
from app.presets import PRESETS


def load_preset(idx: int) -> tuple[Graph, str]:
    p = PRESETS[idx]
    g = Graph.from_pairs(
        [n["id"] for n in p["nodes"]],
        [(e["u"], e["v"], e["w"]) for e in p["edges"]],
    )
    return g, p["source"]


def random_nonnegative_graph(seed: int, n: int = 8, m: int = 16) -> Graph:
    rng = random.Random(seed)
    nodes = [f"v{i}" for i in range(n)]
    pairs = [(u, v) for u in nodes for v in nodes if u != v]
    rng.shuffle(pairs)
    edges = [(u, v, float(rng.randint(1, 20))) for u, v in pairs[:m]]
    return Graph.from_pairs(nodes, edges)


# ---------- 主线一：无负权时两种算法结果一致 ----------

@pytest.mark.parametrize("seed", range(30))
def test_dijkstra_equals_bellman_ford_on_random_nonnegative_graphs(seed: int):
    g = random_nonnegative_graph(seed)
    source = "v0"
    _, d_dij, _ = dijkstra(g, source)
    _, d_bf, _, cycle, _ = bellman_ford(g, source)
    assert cycle is None
    assert d_dij == d_bf


def test_dijkstra_equals_bellman_ford_on_preset_1():
    g, source = load_preset(0)
    _, d_dij, _ = dijkstra(g, source)
    _, d_bf, _, cycle, _ = bellman_ford(g, source)
    assert cycle is None
    assert d_dij == d_bf
    # CLRS 示例的已知答案
    assert d_dij == {"s": 0, "t": 8, "y": 5, "x": 9, "z": 7}


# ---------- 主线二：负权环被如实识别 ----------

def test_negative_cycle_detected_on_preset_3():
    g, source = load_preset(2)
    steps, dist, pred, cycle, unbounded = bellman_ford(g, source)
    assert cycle is not None, "负权环必须被识别出来"
    assert dist is None and pred is None, "有负权环时不得返回有限距离"
    assert cycle[0] == cycle[-1], "环应首尾相接"
    assert set(cycle[:-1]) == {"B", "C", "D"}
    assert cycle_weight(g, cycle) < 0, "识别出的环总权重必须为负"
    assert steps[-1]["kind"] == "cycle"
    # S/A 在环外、距离确定；B/C/D 在环上，距离为 -∞
    assert unbounded == ["B", "C", "D"]
    final = steps[-1]["distances"]
    assert final == {"S": 0.0, "A": 2.0, "B": "-Infinity", "C": "-Infinity", "D": "-Infinity"}


# 用户复现用图：环 B→C→D→B，E 只在环的下游（自身不在环上），
# F 在环影响不到的分支上
def _downstream_cycle_graph() -> Graph:
    return Graph.from_pairs(
        ["S", "A", "B", "C", "D", "E", "F"],
        [
            ("S", "A", 2),
            ("A", "B", 1),
            ("B", "C", -1),
            ("C", "D", -1),
            ("D", "B", -1),
            ("D", "E", 4),
            ("A", "F", 3),
        ],
    )


def test_downstream_of_cycle_is_negative_infinity():
    g = _downstream_cycle_graph()
    steps, dist, pred, cycle, unbounded = bellman_ford(g, "S")
    assert cycle is not None
    assert set(cycle[:-1]) == {"B", "C", "D"}
    # 环上三个点 + 仅在环下游的 E；S/A/F 不受影响
    assert unbounded == ["B", "C", "D", "E"]
    assert dist is None and pred is None

    final = steps[-1]["distances"]
    # 受影响节点一律为 -∞，绝不能以有限数（如 -15/-13/-14/-10）出现
    for n in ["B", "C", "D", "E"]:
        assert final[n] == "-Infinity"
    # 环影响不到的节点距离照常给出确定值
    assert final["S"] == 0.0
    assert final["A"] == 2.0
    assert final["F"] == 5.0
    # -∞ 节点的前驱在结论步骤中也不再保留
    assert all(steps[-1]["predecessors"][n] is None for n in ["B", "C", "D", "E"])
    assert steps[-1]["predecessors"]["F"] == "A"


def test_relaxation_rounds_before_detection_show_finite_values():
    """检测步骤之前的各轮松弛照实播放，不得提前把结论亮出来。"""
    g = _downstream_cycle_graph()
    steps, *_ = bellman_ford(g, "S")
    assert steps[-1]["kind"] == "cycle"
    for s in steps[:-1]:
        assert s["negativeInfinity"] == []
        for n, d in s["distances"].items():
            assert d != "-Infinity", f"步骤 {s['kind']} 提前把 {n} 标成了 -∞"


def test_unreachable_negative_cycle_is_ignored():
    """负权环从源点不可达时，不得影响任何节点的最短距离。"""
    g = Graph.from_pairs(
        ["S", "A", "X", "Y"],
        [
            ("S", "A", 2),
            ("X", "Y", -1),
            ("Y", "X", -1),
        ],
    )
    steps, dist, pred, cycle, unbounded = bellman_ford(g, "S")
    assert cycle is None
    assert unbounded is None
    assert dist == {"S": 0.0, "A": 2.0, "X": math.inf, "Y": math.inf}
    assert steps[-1]["negativeInfinity"] == []


def test_no_false_positive_cycle_on_preset_2():
    g, source = load_preset(1)
    _, dist, _, cycle, _ = bellman_ford(g, source)
    assert cycle is None
    # CLRS 示例的已知答案（含负权边）
    assert dist == {"s": 0, "t": 2, "x": 4, "y": 7, "z": -2}


# ---------- Dijkstra 遇到负权边必须拒绝 ----------

def test_dijkstra_rejects_negative_weights():
    g, source = load_preset(1)
    with pytest.raises(NegativeWeightError):
        dijkstra(g, source)


# ---------- 不变量：源点到自身距离恒为零 ----------

@pytest.mark.parametrize("seed", range(10))
def test_source_distance_is_zero(seed: int):
    g = random_nonnegative_graph(seed + 1000)
    _, d_dij, _ = dijkstra(g, "v0")
    _, d_bf, _, _, _ = bellman_ford(g, "v0")
    assert d_dij["v0"] == 0
    assert d_bf["v0"] == 0


# ---------- 不变量：不可达节点距离为无穷大 ----------

def test_unreachable_node_is_infinite():
    g, source = load_preset(3)
    _, d_dij, _ = dijkstra(g, source)
    _, d_bf, _, _, _ = bellman_ford(g, source)
    assert d_dij["E"] == math.inf
    assert d_bf["E"] == math.inf
    assert d_dij["D"] == 3  # A→C→B→D


# ---------- 不变量：边权调大，任何最短距离都不会减小 ----------

@pytest.mark.parametrize("seed", range(15))
def test_increasing_edge_weight_never_decreases_distances(seed: int):
    g = random_nonnegative_graph(seed + 2000)
    source = "v0"
    _, before, _ = dijkstra(g, source)
    for i, e in enumerate(g.edges):
        bumped = Graph(
            nodes=g.nodes,
            edges=[Edge(e.u, e.v, e.w + 5.0) if j == i else ej for j, ej in enumerate(g.edges)],
        )
        _, after, _ = dijkstra(bumped, source)
        for n in g.nodes:
            assert after[n] >= before[n], f"调大边 {e.u}→{e.v} 后 {n} 的距离变小了"


# ---------- 路径回溯的正确性 ----------

@pytest.mark.parametrize("seed", range(15))
def test_reconstructed_paths_are_valid(seed: int):
    g = random_nonnegative_graph(seed + 3000)
    source = "v0"
    _, dist, pred = dijkstra(g, source)
    paths = build_paths(pred, source, g.nodes)
    weight = {(e.u, e.v): e.w for e in g.edges}
    for node, path in paths.items():
        assert path[0] == source and path[-1] == node
        total = sum(weight[(a, b)] for a, b in zip(path, path[1:]))
        assert total == dist[node]
    # 可达节点都有路径，不可达节点没有
    for n in g.nodes:
        if dist[n] == math.inf:
            assert n not in paths
        else:
            assert n in paths


# ---------- 轨迹（trace）本身的 sanity check ----------

def test_trace_snapshots_are_consistent():
    g, source = load_preset(0)
    steps, dist, _ = dijkstra(g, source)
    assert steps[0]["kind"] == "init"
    assert steps[-1]["kind"] == "done"
    # 最后一步的距离快照就是最终结果（∞ 序列化为 None）
    final = steps[-1]["distances"]
    for n, d in dist.items():
        assert final[n] == (None if d == math.inf else d)
    # 每一步的距离快照都覆盖全部节点
    for s in steps:
        assert set(s["distances"].keys()) == set(g.nodes)
