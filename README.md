# 最短路径算法教学看板（Dijkstra & Bellman–Ford）

面向计算机专业学生的单源最短路教学演示应用：在同一张带权有向图上对比
Dijkstra（仅非负权）与 Bellman–Ford（支持负权边、可识别负权环）的执行过程与适用边界。

## 功能

- **图编辑画布（SVG）**：点击添加节点、拖拽建立有向边、双击边修改权重（允许负值）、
  拖动节点调整位置、双击节点删除、选中后 Delete 删除
- **邻接矩阵**：与图结构实时同步，当前松弛的边对应单元格高亮，负权边红色标注
- **逐步演示**：当前边高亮、距离表逐步更新、已确定节点打勾；
  Dijkstra 展示优先队列变化，Bellman–Ford 展示按轮次松弛；
  支持播放 / 暂停 / 单步 / 0.5×–4× 变速
- **结果展示**：最短路径整条高亮并显示总权重；检测到负权环时高亮环上节点与边，
  明确报告「存在负权环，最短路不存在」
- **正确性由后端守住**：所有算法（Dijkstra、Bellman–Ford、负权环检测、路径回溯）
  都在后端计算，逐步中间状态（距离表快照、被松弛的边、队列/轮次）返回给前端驱动动画，
  前端只渲染不重算；Dijkstra 遇到负权边直接拒绝并说明原因

## 一键运行（Docker）

```bash
docker compose up --build
# 或：docker build -t sp-board . && docker run -p 8000:8000 sp-board
```

打开 http://localhost:8000 ，页面与 API 同端口对外。

## 本地开发

```bash
# 后端（Python 3.12）
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000

# 前端（另开终端，Vite 已配置 /api 代理到 8000）
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

## 测试

```bash
cd backend
pytest
```

测试钉住两条正确性主线（`backend/tests/`）：

1. **无负权边时**，Dijkstra 与 Bellman–Ford 给出的各节点最短距离完全一致
   （30 张随机图 + CLRS 经典图）；
2. **存在从源点可达的负权环时**，如实识别并报告，绝不返回有限的最短距离。

另覆盖：边权调大任何距离不减小（单调性）、源点到自身距离恒为 0、
不可达节点距离为 ∞、Dijkstra 拒绝负权边、路径回溯合法性、
非法输入（引用不存在的节点 / 重复边 / 自环 / 非法源点）返回 400 与中文原因。

## 工程结构

```
├── Dockerfile              # 多阶段：前端构建 → Python 3.12 运行时，单容器对外
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口：/api/run、/api/presets、静态托管
│   │   ├── graph.py                # 图模型（带权有向图 + 邻接表）
│   │   ├── dijkstra.py             # Dijkstra（负权边拒绝）
│   │   ├── bellman_ford.py         # Bellman–Ford（按轮次松弛）
│   │   ├── negative_cycle.py       # 负权环检测与环上节点回溯
│   │   ├── path_reconstruction.py  # 最短路径回溯
│   │   ├── trace.py                # 逐步快照构造
│   │   ├── schemas.py              # 请求模型与输入校验
│   │   ├── errors.py               # 算法异常
│   │   └── presets.py              # 内置经典图（含负权边图、负权环图）
│   └── tests/                      # pytest：算法正确性 + API 契约
└── frontend/
    └── src/
        ├── App.tsx                 # 状态编排与播放控制
        ├── api.ts                  # 后端调用
        ├── types.ts                # 与后端对应的类型
        └── components/
            ├── GraphCanvas.tsx     # 图编辑画布（SVG）
            ├── AdjacencyMatrix.tsx # 邻接矩阵
            ├── DistanceTable.tsx   # 距离表
            ├── ControlPanel.tsx    # 演示控制（运行/暂停/单步/变速）
            ├── AlgoStatePanel.tsx  # 优先队列 / 轮次信息
            └── PathPanel.tsx       # 最短路径 / 负权环报告
```

## API

- `GET /api/presets` — 内置经典图（含建议源点与布局坐标）
- `POST /api/run` — 运行算法，请求体：

```json
{
  "graph": {"nodes": ["s", "t"], "edges": [{"u": "s", "v": "t", "w": 3}]},
  "source": "s",
  "algorithm": "dijkstra"
}
```

响应包含 `steps`（逐步快照：`distances` / `predecessors` / `settled` / `queue` / `round` /
当前边与松弛结果）、最终 `distances`（`null` 表示 ∞）、`paths`（回溯出的完整路径）。
负权环时 `status = "negative_cycle"`，`distances` / `paths` 为 `null`，`cycle` 给出环上节点。
非法输入返回 `400` 与 `{"detail": "中文原因"}`。
