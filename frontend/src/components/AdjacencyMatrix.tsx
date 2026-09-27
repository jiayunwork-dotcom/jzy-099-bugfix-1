import type { GraphState, StepEdge } from "../types";
import { fmtDist } from "../types";

interface Props {
  graph: GraphState;
  currentEdge: StepEdge | null;
}

/** 邻接矩阵：与画布上的图结构实时同步，当前正在松弛的边对应单元格高亮 */
export default function AdjacencyMatrix({ graph, currentEdge }: Props) {
  const ids = graph.nodes.map((n) => n.id);
  const weight = new Map<string, number>();
  for (const e of graph.edges) weight.set(`${e.u}|${e.v}`, e.w);

  if (ids.length === 0) {
    return <div className="panel"><h3>邻接矩阵</h3><p className="muted">图为空</p></div>;
  }

  return (
    <div className="panel">
      <h3>邻接矩阵</h3>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th></th>
              {ids.map((id) => (
                <th key={id}>{id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((u) => (
              <tr key={u}>
                <th>{u}</th>
                {ids.map((v) => {
                  const w = weight.get(`${u}|${v}`);
                  const active = currentEdge !== null && currentEdge.u === u && currentEdge.v === v;
                  const cls = [
                    w !== undefined && w < 0 ? "neg" : "",
                    active ? "active" : "",
                  ].join(" ");
                  return (
                    <td key={v} className={cls}>
                      {u === v ? "0" : w === undefined ? "∞" : fmtDist(w)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
