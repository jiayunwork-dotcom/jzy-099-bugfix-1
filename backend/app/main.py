"""FastAPI 入口：算法接口 + 前端静态文件托管。

POST /api/run      运行 Dijkstra 或 Bellman–Ford，返回逐步轨迹与最终结果
GET  /api/presets  返回内置经典图
"""

from __future__ import annotations

import math
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .bellman_ford import bellman_ford
from .dijkstra import dijkstra
from .errors import AlgorithmError
from .graph import Edge, Graph
from .path_reconstruction import build_paths
from .presets import PRESETS
from .schemas import RunRequest
from .trace import snapshot_distances

app = FastAPI(title="最短路径算法教学看板")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """把输入校验失败统一成 400 + 中文原因。"""
    msgs: list[str] = []
    for err in exc.errors():
        msg = str(err.get("msg", ""))
        prefix = "Value error, "
        if msg.startswith(prefix):
            msg = msg[len(prefix):]
        if msg and msg not in msgs:
            msgs.append(msg)
    return JSONResponse(status_code=400, content={"detail": "；".join(msgs) or "请求参数非法"})


@app.exception_handler(AlgorithmError)
async def algorithm_error_handler(_: Request, exc: AlgorithmError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/presets")
def get_presets() -> list[dict]:
    return PRESETS


@app.post("/api/run")
def run(req: RunRequest) -> dict:
    graph = Graph(
        nodes=req.graph.nodes,
        edges=[Edge(e.u, e.v, e.w) for e in req.graph.edges],
    )

    if req.algorithm == "dijkstra":
        steps, dist, pred = dijkstra(graph, req.source)
        cycle = None
    else:
        steps, dist, pred, cycle = bellman_ford(graph, req.source)

    if cycle is not None:
        # 存在负权环：如实报告，绝不返回有限的最短距离
        return {
            "status": "negative_cycle",
            "algorithm": req.algorithm,
            "source": req.source,
            "steps": steps,
            "distances": None,
            "paths": None,
            "cycle": cycle,
        }

    assert dist is not None and pred is not None
    return {
        "status": "ok",
        "algorithm": req.algorithm,
        "source": req.source,
        "steps": steps,
        "distances": snapshot_distances(dist),
        "paths": build_paths(pred, req.source, graph.nodes),
        "cycle": None,
    }


# Docker 中前端构建产物放在 <repo>/static；存在才挂载，便于本地跑测试
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
