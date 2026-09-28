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

/**
 * 负无穷（因负权环导致最短距离不存在）。
 * JSON 无法表示 ±∞：不可达为 null（渲染 ∞），受负权环影响为该字符串（渲染 −∞）。
 * 判定完全由后端给出，前端只做渲染，不自行推导。
 */
export const NEG_INF = "-Infinity" as const;
export type Distance = number | null | typeof NEG_INF;

/** 后端返回的每一步快照：距离表、前驱表、已确定集合、队列/轮次信息 */
export interface Step {
  kind: "init" | "visit" | "relax" | "skip" | "round" | "early-stop" | "cycle" | "done";
  message: string;
  edge: StepEdge | null;
  relaxed: boolean;
  distances: Record<string, Distance>;
  predecessors: Record<string, string | null>;
  settled: string[];
  queue: QueueEntry[] | null;
  round: number | null;
  /** 本步判定为最短距离 −∞ 的节点；只有检测到负权环的最后一步非空 */
  negativeInfinity: string[];
}

export interface RunResponse {
  status: "ok" | "negative_cycle";
  algorithm: Algorithm;
  source: string;
  steps: Step[];
  distances: Record<string, number | null> | null;
  paths: Record<string, string[]> | null;
  cycle: string[] | null;
  /** 最短距离因负权环而不存在（−∞）的节点：环上节点 + 环下游可达节点 */
  negative_infinity_nodes: string[];
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

/** 距离 / 权重的统一格式化：null → ∞，负权环导致的 −∞ → −∞，整数不带小数点 */
export function fmtDist(d: Distance | number | null | undefined): string {
  if (d === null || d === undefined) return "∞";
  if (d === NEG_INF) return "−∞";
  return Number.isInteger(d) ? String(d) : d.toFixed(2);
}
