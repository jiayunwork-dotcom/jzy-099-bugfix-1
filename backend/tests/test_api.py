"""API 层测试：接口契约与非法输入的拒绝。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.presets import PRESETS

client = TestClient(app)


def preset_payload(idx: int, algorithm: str) -> dict:
    p = PRESETS[idx]
    return {
        "graph": {
            "nodes": [n["id"] for n in p["nodes"]],
            "edges": p["edges"],
        },
        "source": p["source"],
        "algorithm": algorithm,
    }


def test_presets_endpoint():
    r = client.get("/api/presets")
    assert r.status_code == 200
    presets = r.json()
    assert len(presets) >= 3
    assert any("负权环" in p["name"] for p in presets)
    assert any("负权" in p["description"] and "无负权环" in p["description"] for p in presets)


def test_run_dijkstra_ok():
    r = client.post("/api/run", json=preset_payload(0, "dijkstra"))
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["distances"] == {"s": 0, "t": 8, "y": 5, "x": 9, "z": 7}
    assert data["steps"][0]["kind"] == "init"
    assert data["steps"][-1]["kind"] == "done"
    assert data["paths"]["x"] == ["s", "y", "t", "x"]


def test_two_algorithms_agree_when_no_negative_weights():
    d1 = client.post("/api/run", json=preset_payload(0, "dijkstra")).json()
    d2 = client.post("/api/run", json=preset_payload(0, "bellman-ford")).json()
    assert d1["distances"] == d2["distances"]


def test_dijkstra_rejects_negative_weight_edge():
    r = client.post("/api/run", json=preset_payload(1, "dijkstra"))
    assert r.status_code == 400
    assert "负权" in r.json()["detail"]


def test_bellman_ford_reports_negative_cycle():
    r = client.post("/api/run", json=preset_payload(2, "bellman-ford"))
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "negative_cycle"
    assert data["distances"] is None, "有负权环时不得返回有限距离"
    assert data["paths"] is None
    assert set(data["cycle"][:-1]) == {"B", "C", "D"}
    assert data["steps"][-1]["kind"] == "cycle"


def test_unreachable_distance_is_null():
    data = client.post("/api/run", json=preset_payload(3, "dijkstra")).json()
    assert data["distances"]["E"] is None
    assert "E" not in data["paths"]


def test_reject_edge_referencing_unknown_node():
    body = {
        "graph": {"nodes": ["A", "B"], "edges": [{"u": "A", "v": "C", "w": 1}]},
        "source": "A",
        "algorithm": "dijkstra",
    }
    r = client.post("/api/run", json=body)
    assert r.status_code == 400
    assert "不存在的节点" in r.json()["detail"]


def test_reject_unknown_source():
    body = {
        "graph": {"nodes": ["A"], "edges": []},
        "source": "ZZ",
        "algorithm": "bellman-ford",
    }
    r = client.post("/api/run", json=body)
    assert r.status_code == 400
    assert "源点" in r.json()["detail"]


def test_reject_duplicate_and_self_loop_edges():
    base = {"source": "A", "algorithm": "dijkstra"}
    dup = {"graph": {"nodes": ["A", "B"], "edges": [
        {"u": "A", "v": "B", "w": 1}, {"u": "A", "v": "B", "w": 2}]}, **base}
    assert client.post("/api/run", json=dup).status_code == 400
    loop = {"graph": {"nodes": ["A"], "edges": [{"u": "A", "v": "A", "w": 1}]}, **base}
    r = client.post("/api/run", json=loop)
    assert r.status_code == 400
    assert "自环" in r.json()["detail"]


def test_reject_unknown_algorithm():
    body = preset_payload(0, "floyd")
    assert client.post("/api/run", json=body).status_code == 400
