/** 与后端 API 对应的类型定义。前端只渲染，不做任何算法计算。 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  u: string;
  v: string;
  w: number;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type Mode = "select" | "add-node" | "add-edge";
export type Algorithm = "dijkstra" | "bellman-ford";

export interface StepEdge {
  u: string;
  v: string;
  w: number;
}

export interface QueueEntry {
  node: string;
  dist: number;
}

/** 后端返回的每一步快照：距离表、前驱表、已确定集合、队列/轮次信息 */
export interface Step {
  kind: "init" | "visit" | "relax" | "skip" | "round" | "early-stop" | "cycle" | "done";
  message: string;
  edge: StepEdge | null;
  relaxed: boolean;
  distances: Record<string, number | null>;
  predecessors: Record<string, string | null>;
  settled: string[];
  queue: QueueEntry[] | null;
  round: number | null;
}

export interface RunResponse {
  status: "ok" | "negative_cycle";
  algorithm: Algorithm;
  source: string;
  steps: Step[];
  distances: Record<string, number | null> | null;
  paths: Record<string, string[]> | null;
  cycle: string[] | null;
}

export interface PresetNode {
  id: string;
  x: number;
  y: number;
}

export interface PresetEdge {
  u: string;
  v: string;
  w: number;
}

export interface Preset {
  name: string;
  description: string;
  source: string;
  nodes: PresetNode[];
  edges: PresetEdge[];
}

/** 距离 / 权重的统一格式化：null → ∞，整数不带小数点 */
export function fmtDist(d: number | null | undefined): string {
  if (d === null || d === undefined) return "∞";
  return Number.isInteger(d) ? String(d) : d.toFixed(2);
}
