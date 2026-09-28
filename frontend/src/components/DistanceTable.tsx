import type { Step } from "../types";
import { fmtDist, NEG_INF } from "../types";

interface Props {
  nodeIds: string[];
  step: Step | null;
  source: string | null;
}

/** 距离表：随每一步快照更新，已确定最短距离的节点打勾标记 */
export default function DistanceTable({ nodeIds, step, source }: Props) {
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
            const d = step ? step.distances[id] : null;
            const pred = step ? step.predecessors[id] : null;
            const settled = step !== null && step.settled.includes(id);
            const isNegInf = d === NEG_INF;
            const isInf = d === null || d === undefined;
            return (
              <tr key={id} className={settled ? "settled" : ""}>
                <td className="mono">{id}</td>
                <td
                  className={`mono ${isNegInf ? "neg-inf" : isInf ? "inf" : ""}`}
                  title={isNegInf ? "存在从源点可达的负权环，最短距离为负无穷，最短路不存在" : undefined}
                >
                  {step ? fmtDist(d) : "—"}
                </td>
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
