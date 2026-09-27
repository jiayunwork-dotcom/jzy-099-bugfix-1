import type { Algorithm, Step } from "../types";
import { fmtDist } from "../types";

interface Props {
  algorithm: Algorithm;
  step: Step | null;
  nodeCount: number;
}

/** 算法专属状态：Dijkstra 的优先队列 / Bellman–Ford 的轮次信息 */
export default function AlgoStatePanel({ algorithm, step, nodeCount }: Props) {
  return (
    <div className="panel">
      <h3>{algorithm === "dijkstra" ? "优先队列（按距离升序）" : "轮次信息"}</h3>
      {algorithm === "dijkstra" ? (
        step && step.queue && step.queue.length > 0 ? (
          <div className="queue">
            {step.queue.map((q, i) => (
              <span key={`${q.node}-${i}`} className={`queue-chip ${i === 0 ? "front" : ""}`}>
                {q.node}: {fmtDist(q.dist)}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">{step ? "队列为空" : "尚未运行"}</p>
        )
      ) : step ? (
        <p className="round-info">
          当前轮次：<strong>{step.round ?? 0}</strong>
          <span className="muted">（轮次上界 |V|−1 = {Math.max(nodeCount - 1, 0)}）</span>
        </p>
      ) : (
        <p className="muted">尚未运行</p>
      )}
    </div>
  );
}
