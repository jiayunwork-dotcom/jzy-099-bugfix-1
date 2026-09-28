import type { Step } from "../types";
import { fmtDist } from "../types";

interface Props {
  nodeIds: string[];
  step: Step | null;
  source: string | null;
}

/** 距离表：随每一步快照更新，已确定最短距离的节点打勾标记 */
export default function DistanceTable({ nodeIds, step, source }: Props) {
  const unbounded = new Set(step?.unbounded_nodes ?? []);
  return (
    <div className="panel">
      <h3>距离表（从源点 {source ?? "—"} 出发）</h3>
      <table className="dist-table">
        <thead>
          <tr>
            <th>节点</th>
            <th>距离</th>
            <th>前驱</th>
            <th>已确定</th>
          </tr>
        </thead>
        <tbody>
          {nodeIds.map((id) => {
            const isUnbounded = unbounded.has(id);
            const d = step ? step.distances[id] : null;
            const pred = step ? step.predecessors[id] : null;
            const settled = step !== null && step.settled.includes(id);
            return (
              <tr key={id} className={`${settled ? "settled" : ""} ${isUnbounded ? "unbounded" : ""}`}>
                <td className="mono">{id}</td>
                {isUnbounded ? (
                  <td
                    className="mono neg-inf"
                    title="该节点受从源点可达的负权环影响，路径权重可任意小，最短距离不存在（−∞）"
                  >
                    −∞
                  </td>
                ) : (
                  <td className={`mono ${d === null || d === undefined ? "inf" : ""}`}>
                    {step ? fmtDist(d) : "—"}
                  </td>
                )}
                <td className="mono">{step ? pred ?? "—" : "—"}</td>
                <td>{settled ? "✓" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
