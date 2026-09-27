import { useEffect, useRef, useState } from "react";
import type { GraphEdge, GraphNode, GraphState, Mode, StepEdge } from "../types";
import { fmtDist } from "../types";

export interface CanvasHighlights {
  source: string | null;
  target: string | null;
  settled: string[];
  currentEdge: StepEdge | null;
  pathEdges: Array<[string, string]>;
  cycleNodes: string[];
  cycleEdges: Array<[string, string]>;
}

interface Props {
  graph: GraphState;
  onChange: (g: GraphState) => void;
  mode: Mode;
  highlights: CanvasHighlights;
  onNodeClick?: (id: string) => void;
}

const W = 800;
const H = 560;
const R = 20; // 节点半径

let edgeSeq = 1;
const nextEdgeId = () => `e${edgeSeq++}`;

function nextNodeId(nodes: GraphNode[]): string {
  const used = new Set(nodes.map((n) => n.id));
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i);
    if (!used.has(c)) return c;
  }
  let k = 1;
  while (used.has(`N${k}`)) k++;
  return `N${k}`;
}

const clampX = (x: number) => Math.min(W - R - 4, Math.max(R + 4, x));
const clampY = (y: number) => Math.min(H - R - 4, Math.max(R + 4, y));

interface EdgeGeom {
  d: string;
  lx: number;
  ly: number;
}

/** 直边或（存在反向边时的）弯边几何，箭头在圆周处截断 */
function edgeGeometry(a: GraphNode, b: GraphNode, curved: boolean): EdgeGeom {
  if (!curved) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const sx = a.x + ux * R;
    const sy = a.y + uy * R;
    const ex = b.x - ux * (R + 5);
    const ey = b.y - uy * (R + 5);
    return { d: `M ${sx} ${sy} L ${ex} ${ey}`, lx: (a.x + b.x) / 2, ly: (a.y + b.y) / 2 };
  }
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * 34;
  const cy = my + ny * 34;
  let tx = cx - a.x;
  let ty = cy - a.y;
  const l1 = Math.hypot(tx, ty) || 1;
  const sx = a.x + (tx / l1) * R;
  const sy = a.y + (ty / l1) * R;
  tx = b.x - cx;
  ty = b.y - cy;
  const l2 = Math.hypot(tx, ty) || 1;
  const ex = b.x - (tx / l2) * (R + 5);
  const ey = b.y - (ty / l2) * (R + 5);
  return {
    d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
    lx: 0.25 * a.x + 0.5 * cx + 0.25 * b.x,
    ly: 0.25 * a.y + 0.5 * cy + 0.25 * b.y,
  };
}

const MODE_HINTS: Record<Mode, string> = {
  select: "选择 / 移动：拖拽节点调整位置；双击节点删除；双击边修改权重；选中后按 Delete 删除",
  "add-node": "添加节点：点击画布空白处放置新节点",
  "add-edge": "添加边：从起点节点按住拖拽到终点节点松开（默认权重 1，可双击修改）",
};

export default function GraphCanvas({ graph, onChange, mode, highlights, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [edgeFrom, setEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<{ type: "node" | "edge"; id: string } | null>(null);
  const [editing, setEditing] = useState<{ edgeId: string; value: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const showHint = (msg: string) => setHint(msg);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 3200);
    return () => clearTimeout(t);
  }, [hint]);

  // 图被外部替换（如载入预设）时，丢弃内部编辑状态
  useEffect(() => {
    setSelected(null);
    setEditing(null);
    setEdgeFrom(null);
  }, [graph]);

  // Delete / Backspace 删除选中元素
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!selected) return;
      if (selected.type === "node") {
        onChange({
          nodes: graph.nodes.filter((n) => n.id !== selected.id),
          edges: graph.edges.filter((x) => x.u !== selected.id && x.v !== selected.id),
        });
      } else {
        onChange({ ...graph, edges: graph.edges.filter((x) => x.id !== selected.id) });
      }
      setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, graph, onChange]);

  const pos = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const nodeById = (id: string) => graph.nodes.find((n) => n.id === id)!;

  // ---------- 交互 ----------

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (mode === "add-node") {
      const p = pos(e);
      const id = nextNodeId(graph.nodes);
      onChange({
        ...graph,
        nodes: [...graph.nodes, { id, x: clampX(p.x), y: clampY(p.y) }],
      });
    }
  };

  const onSvgClick = () => {
    setSelected(null);
    setEditing(null);
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    const p = pos(e);
    if (edgeFrom) setMousePos(p);
    const drag = dragRef.current;
    if (drag) {
      drag.moved = true;
      onChange({
        ...graph,
        nodes: graph.nodes.map((n) =>
          n.id === drag.id ? { ...n, x: clampX(p.x), y: clampY(p.y) } : n
        ),
      });
    }
  };

  const onSvgMouseUp = () => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
    setEdgeFrom(null);
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (mode === "add-edge") {
      setEdgeFrom(id);
      const n = nodeById(id);
      setMousePos({ x: n.x, y: n.y });
    } else if (mode === "select") {
      dragRef.current = { id, moved: false };
    }
  };

  const onNodeMouseUp = (e: React.MouseEvent, id: string) => {
    if (mode !== "add-edge" || !edgeFrom) return;
    e.stopPropagation();
    if (edgeFrom === id) {
      showHint("不支持自环边");
    } else if (graph.edges.some((x) => x.u === edgeFrom && x.v === id)) {
      showHint(`边 ${edgeFrom}→${id} 已存在，不允许重复边`);
    } else {
      onChange({
        ...graph,
        edges: [...graph.edges, { id: nextEdgeId(), u: edgeFrom, v: id, w: 1 }],
      });
    }
    setEdgeFrom(null);
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (mode !== "select") return;
    setSelected({ type: "node", id });
    onNodeClick?.(id);
  };

  const onNodeDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (mode !== "select") return;
    onChange({
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((x) => x.u !== id && x.v !== id),
    });
    setSelected(null);
  };

  const onEdgeClick = (e: React.MouseEvent, edge: GraphEdge) => {
    e.stopPropagation();
    if (mode !== "select") return;
    setSelected({ type: "edge", id: edge.id });
  };

  const onEdgeDoubleClick = (e: React.MouseEvent, edge: GraphEdge) => {
    e.stopPropagation();
    if (mode !== "select") return;
    setEditing({ edgeId: edge.id, value: String(edge.w) });
  };

  const commitWeight = () => {
    if (!editing) return;
    const w = parseFloat(editing.value);
    if (Number.isNaN(w)) {
      showHint("权重必须是数字（允许负值）");
      return;
    }
    onChange({
      ...graph,
      edges: graph.edges.map((x) => (x.id === editing.edgeId ? { ...x, w } : x)),
    });
    setEditing(null);
  };

  const deleteEdge = (edgeId: string) => {
    onChange({ ...graph, edges: graph.edges.filter((x) => x.id !== edgeId) });
    setEditing(null);
    setSelected(null);
  };

  // ---------- 渲染 ----------

  const isCurrent = (e: GraphEdge) =>
    highlights.currentEdge !== null &&
    highlights.currentEdge.u === e.u &&
    highlights.currentEdge.v === e.v;
  const isPath = (e: GraphEdge) =>
    highlights.pathEdges.some(([a, b]) => a === e.u && b === e.v);
  const isCycleEdge = (e: GraphEdge) =>
    highlights.cycleEdges.some(([a, b]) => a === e.u && b === e.v);

  const edgeStroke = (e: GraphEdge): string => {
    if (isCurrent(e)) return "#f59e0b";
    if (isCycleEdge(e)) return "#dc2626";
    if (isPath(e)) return "#2563eb";
    if (selected?.type === "edge" && selected.id === e.id) return "#475569";
    return "#94a3b8";
  };
  const edgeMarker = (e: GraphEdge): string => {
    if (isCurrent(e)) return "url(#arrow-active)";
    if (isCycleEdge(e)) return "url(#arrow-cycle)";
    if (isPath(e)) return "url(#arrow-path)";
    return "url(#arrow)";
  };

  const nodeFill = (id: string): string => {
    if (highlights.cycleNodes.includes(id)) return "#fecaca";
    if (highlights.settled.includes(id)) return "#bbf7d0";
    if (id === highlights.source) return "#dbeafe";
    return "#ffffff";
  };
  const nodeStroke = (id: string): string => {
    if (highlights.cycleNodes.includes(id)) return "#dc2626";
    if (id === highlights.target) return "#7c3aed";
    if (id === highlights.source) return "#2563eb";
    if (highlights.settled.includes(id)) return "#16a34a";
    if (selected?.type === "node" && selected.id === id) return "#475569";
    return "#64748b";
  };

  const editingEdge = editing ? graph.edges.find((x) => x.id === editing.edgeId) : undefined;
  const editingGeom =
    editingEdge &&
    edgeGeometry(
      nodeById(editingEdge.u),
      nodeById(editingEdge.v),
      graph.edges.some((x) => x.u === editingEdge.v && x.v === editingEdge.u)
    );

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={`graph-canvas mode-${mode}`}
        onMouseDown={onSvgMouseDown}
        onClick={onSvgClick}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
          </marker>
          <marker id="arrow-path" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
          </marker>
          <marker id="arrow-cycle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
          </marker>
        </defs>

        {graph.edges.map((e) => {
          const a = nodeById(e.u);
          const b = nodeById(e.v);
          const curved = graph.edges.some((x) => x.u === e.v && x.v === e.u);
          const g = edgeGeometry(a, b, curved);
          const stroke = edgeStroke(e);
          const width = isCurrent(e) || isPath(e) || isCycleEdge(e) ? 3.5 : 2;
          return (
            <g key={e.id}>
              <path
                d={g.d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                onClick={(ev) => onEdgeClick(ev, e)}
                onDoubleClick={(ev) => onEdgeDoubleClick(ev, e)}
                style={{ cursor: mode === "select" ? "pointer" : "default" }}
              />
              <path
                d={g.d}
                fill="none"
                stroke={stroke}
                strokeWidth={width}
                markerEnd={edgeMarker(e)}
                pointerEvents="none"
              />
              <text x={g.lx} y={g.ly - 6} textAnchor="middle" className="edge-label">
                {fmtDist(e.w)}
              </text>
            </g>
          );
        })}

        {edgeFrom && mousePos && (
          <line
            x1={nodeById(edgeFrom).x}
            y1={nodeById(edgeFrom).y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 4"
            markerEnd="url(#arrow-active)"
          />
        )}

        {graph.nodes.map((n) => (
          <g
            key={n.id}
            onMouseDown={(e) => onNodeMouseDown(e, n.id)}
            onMouseUp={(e) => onNodeMouseUp(e, n.id)}
            onClick={(e) => handleNodeClick(e, n.id)}
            onDoubleClick={(e) => onNodeDoubleClick(e, n.id)}
            style={{ cursor: mode === "select" ? "grab" : "pointer" }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={R}
              fill={nodeFill(n.id)}
              stroke={nodeStroke(n.id)}
              strokeWidth={n.id === highlights.target || highlights.cycleNodes.includes(n.id) ? 3 : 2}
            />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="node-label">
              {n.id}
            </text>
          </g>
        ))}
      </svg>

      {editing && editingEdge && editingGeom && (
        <div
          className="weight-editor"
          style={{ left: editingGeom.lx, top: editingGeom.ly }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="weight-editor-title">
            {editingEdge.u}→{editingEdge.v} 权重
          </span>
          <input
            autoFocus
            type="number"
            step="any"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitWeight();
              if (e.key === "Escape") setEditing(null);
            }}
          />
          <div className="weight-editor-actions">
            <button onClick={commitWeight}>确定</button>
            <button className="danger" onClick={() => deleteEdge(editing.edgeId)}>
              删除边
            </button>
            <button onClick={() => setEditing(null)}>取消</button>
          </div>
        </div>
      )}

      <div className="canvas-footer">
        <span className="mode-hint">{MODE_HINTS[mode]}</span>
        {hint && <span className="canvas-hint">{hint}</span>}
      </div>
    </div>
  );
}
