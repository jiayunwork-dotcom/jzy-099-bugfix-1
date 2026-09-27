import type { Algorithm } from "../types";

interface Props {
  nodeIds: string[];
  source: string | null;
  onSourceChange: (s: string) => void;
  algorithm: Algorithm;
  onAlgorithmChange: (a: Algorithm) => void;
  onRun: () => void;
  hasRun: boolean;
  playing: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onResetPlayback: () => void;
  canStep: boolean;
  speed: number;
  onSpeedChange: (s: number) => void;
  stepIndex: number;
  totalSteps: number;
  message: string | null;
  error: string | null;
}

/** 演示控制：源点 / 算法选择、运行、播放暂停、单步、速度，以及当前步骤说明 */
export default function ControlPanel(props: Props) {
  const speeds = [0.5, 1, 2, 4];
  return (
    <div className="panel">
      <h3>演示控制</h3>

      <div className="control-row">
        <label>源点</label>
        <select
          value={props.source ?? ""}
          onChange={(e) => props.onSourceChange(e.target.value)}
        >
          {props.nodeIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        <label>算法</label>
        <label className="radio">
          <input
            type="radio"
            checked={props.algorithm === "dijkstra"}
            onChange={() => props.onAlgorithmChange("dijkstra")}
          />
          Dijkstra
        </label>
        <label className="radio">
          <input
            type="radio"
            checked={props.algorithm === "bellman-ford"}
            onChange={() => props.onAlgorithmChange("bellman-ford")}
          />
          Bellman–Ford
        </label>

        <button className="primary" onClick={props.onRun} disabled={!props.source}>
          运行
        </button>
      </div>

      <div className="control-row">
        <button onClick={props.onPlayPause} disabled={!props.hasRun}>
          {props.playing ? "⏸ 暂停" : "▶ 播放"}
        </button>
        <button onClick={props.onStep} disabled={!props.canStep}>
          单步 →
        </button>
        <button onClick={props.onResetPlayback} disabled={!props.hasRun}>
          ↺ 重置
        </button>
        <label>速度</label>
        <select value={props.speed} onChange={(e) => props.onSpeedChange(Number(e.target.value))}>
          {speeds.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        {props.hasRun && (
          <span className="muted">
            步骤 {props.stepIndex + 1} / {props.totalSteps}
          </span>
        )}
      </div>

      {props.error && <div className="banner error">⚠ {props.error}</div>}
      {props.message && <div className="banner info">{props.message}</div>}
    </div>
  );
}
