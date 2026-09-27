import type { RunResponse } from "../types";
import { fmtDist } from "../types";

interface Props {
  run: RunResponse | null;
  finished: boolean;
  nodeIds: string[];
  target: string | null;
  onTargetChange: (t: string | null) => void;
}

/** 结果面板：负权环报告，或到任一目标节点的最短路径与总权重 */
export default function PathPanel({ run, finished, nodeIds, target, onTargetChange }: Props) {
  if (!run || !finished) {
    return (
      <div className="panel">
        <h3>最短路径</h3>
        <p className="muted">运行算法并演示结束后，在此查看从源点到任一目标节点的最短路径。</p>
      </div>
    );
  }

  if (run.status === "negative_cycle") {
    return (
      <div className="panel">
        <h3>最短路径</h3>
        <div className="banner cycle">
          ⛔ 存在负权环：{run.cycle?.join(" → ")}，最短路不存在
        </div>
        <p className="muted">
          负权环上的节点可以无限绕圈使路径权重任意小，因此不存在有限的最短距离。
        </p>
      </div>
    );
  }

  const path = target && run.paths ? run.paths[target] : undefined;
  const dist = target && run.distances ? run.distances[target] : undefined;

  return (
    <div className="panel">
      <h3>最短路径</h3>
      <div className="control-row">
        <label>目标节点</label>
        <select
          value={target ?? ""}
          onChange={(e) => onTargetChange(e.target.value || null)}
        >
          <option value="">选择目标…</option>
          {nodeIds
            .filter((id) => id !== run.source)
            .map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
        </select>
      </div>
      {target && (
        <>
          {path ? (
            <div className="path-result">
              <div className="path-chain">{path.join(" → ")}</div>
              <div>
                总权重：<strong>{fmtDist(dist ?? null)}</strong>
              </div>
            </div>
          ) : (
            <div className="banner warn">节点 {target} 从源点不可达，距离为 ∞</div>
          )}
        </>
      )}
    </div>
  );
}
