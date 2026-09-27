import type { Algorithm, GraphState, Preset, RunResponse } from "./types";

export async function fetchPresets(): Promise<Preset[]> {
  const r = await fetch("/api/presets");
  if (!r.ok) throw new Error("载入预设图失败");
  return r.json();
}

export async function runAlgorithm(
  graph: GraphState,
  source: string,
  algorithm: Algorithm
): Promise<RunResponse> {
  const r = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      graph: {
        nodes: graph.nodes.map((n) => n.id),
        edges: graph.edges.map((e) => ({ u: e.u, v: e.v, w: e.w })),
      },
      source,
      algorithm,
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    // 后端对非法输入 / 算法拒绝都返回 {detail: "中文原因"}
    throw new Error(data.detail ?? "请求失败");
  }
  return data;
}
