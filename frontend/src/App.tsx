import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPresets, runAlgorithm } from "./api";
import AdjacencyMatrix from "./components/AdjacencyMatrix";
import AlgoStatePanel from "./components/AlgoStatePanel";
import ControlPanel from "./components/ControlPanel";
import DistanceTable from "./components/DistanceTable";
import GraphCanvas, { CanvasHighlights } from "./components/GraphCanvas";
import PathPanel from "./components/PathPanel";
import type { Algorithm, GraphState, Mode, Preset, RunResponse } from "./types";

const EMPTY_GRAPH: GraphState = { nodes: [], edges: [] };

export default function App() {
  const [graph, setGraph] = useState<GraphState>(EMPTY_GRAPH);
  const [mode, setMode] = useState<Mode>("select");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetDesc, setPresetDesc] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>("dijkstra");
  const [run, setRun] = useState<RunResponse | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 载入预设列表，并默认载入第一张图
  useEffect(() => {
    fetchPresets()
      .then((ps) => {
        setPresets(ps);
        if (ps.length > 0) loadPreset(ps[0]);
      })
      .catch((e) => setError(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreset = (p: Preset) => {
    setGraph({
      nodes: p.nodes.map((n) => ({ ...n })),
      edges: p.edges.map((e, i) => ({ id: `pe${i}`, ...e })),
    });
    setSource(p.source);
    setPresetDesc(p.description);
    clearRun();
  };

  const clearRun = () => {
    setRun(null);
    setStepIndex(0);
    setPlaying(false);
    setTarget(null);
  };

  // 图被编辑后，旧的演示结果不再适用
  const handleGraphChange = useCallback((g: GraphState) => {
    setGraph(g);
    clearRun();
    setError(null);
    setSource((s) => {
      if (s && g.nodes.some((n) => n.id === s)) return s;
      return g.nodes.length > 0 ? g.nodes[0].id : null;
    });
  }, []);

  const handleRun = async () => {
    if (!source) return;
    setError(null);
    setPlaying(false);
    try {
      const res = await runAlgorithm(graph, source, algorithm);
      setRun(res);
      setStepIndex(0);
      setTarget(null);
      setPlaying(true);
    } catch (e) {
      setRun(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const totalSteps = run?.steps.length ?? 0;
  const atEnd = run !== null && stepIndex >= totalSteps - 1;

  // 播放定时器
  useEffect(() => {
    if (!playing || !run) return;
    if (stepIndex >= run.steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(
      () => setStepIndex((i) => Math.min(i + 1, run.steps.length - 1)),
      1400 / speed
    );
    return () => clearTimeout(t);
  }, [playing, stepIndex, run, speed]);

  const step = run ? run.steps[Math.min(stepIndex, totalSteps - 1)] : null;

  // 演示结束后的路径 / 负权环高亮
  const highlights: CanvasHighlights = useMemo(() => {
    const pathEdges: Array<[string, string]> = [];
    if (run?.status === "ok" && atEnd && target && run.paths?.[target]) {
      const p = run.paths[target];
      for (let i = 0; i + 1 < p.length; i++) pathEdges.push([p[i], p[i + 1]]);
    }
    const cycleEdges: Array<[string, string]> = [];
    const cycleNodes: string[] = [];
    if (run?.status === "negative_cycle" && atEnd && run.cycle) {
      const c = run.cycle;
      for (let i = 0; i + 1 < c.length; i++) cycleEdges.push([c[i], c[i + 1]]);
      cycleNodes.push(...c.slice(0, -1));
    }
    return {
      source,
      target,
      settled: step?.settled ?? [],
      currentEdge: step?.edge ?? null,
      pathEdges,
      cycleNodes,
      cycleEdges,
    };
  }, [run, atEnd, target, step, source]);

  const nodeIds = graph.nodes.map((n) => n.id);

  return (
    <div className="app">
      <header className="app-header">
        <h1>最短路径算法教学看板</h1>
        <div className="header-controls">
          <select
            value=""
            onChange={(e) => {
              const p = presets[Number(e.target.value)];
              if (p) loadPreset(p);
            }}
          >
            <option value="">载入预设图…</option>
            {presets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="mode-group">
            {(
              [
                ["select", "选择/移动"],
                ["add-node", "添加节点"],
                ["add-edge", "添加边"],
              ] as Array<[Mode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                className={mode === m ? "mode active" : "mode"}
                onClick={() => setMode(m)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="danger"
            onClick={() => {
              setGraph(EMPTY_GRAPH);
              setSource(null);
              clearRun();
            }}
          >
            清空画布
          </button>
        </div>
      </header>

      {presetDesc && <div className="preset-desc">📌 {presetDesc}</div>}

      <main className="app-main">
        <section className="left-col">
          <GraphCanvas
            graph={graph}
            onChange={handleGraphChange}
            mode={mode}
            highlights={highlights}
            onNodeClick={(id) => {
              if (run?.status === "ok" && atEnd && id !== run.source) setTarget(id);
            }}
          />
          <AdjacencyMatrix graph={graph} currentEdge={step?.edge ?? null} />
        </section>

        <aside className="right-col">
          <ControlPanel
            nodeIds={nodeIds}
            source={source}
            onSourceChange={(s) => {
              setSource(s);
              clearRun();
            }}
            algorithm={algorithm}
            onAlgorithmChange={(a) => {
              setAlgorithm(a);
              clearRun();
            }}
            onRun={handleRun}
            hasRun={run !== null}
            playing={playing}
            onPlayPause={() => setPlaying((p) => !p)}
            onStep={() => {
              setPlaying(false);
              setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
            }}
            onResetPlayback={() => {
              setPlaying(false);
              setStepIndex(0);
            }}
            canStep={run !== null && !atEnd}
            speed={speed}
            onSpeedChange={setSpeed}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            message={step?.message ?? null}
            error={error}
          />
          <AlgoStatePanel algorithm={algorithm} step={step} nodeCount={nodeIds.length} />
          <DistanceTable nodeIds={nodeIds} step={step} source={source} />
          <PathPanel
            run={run}
            finished={atEnd}
            nodeIds={nodeIds}
            target={target}
            onTargetChange={setTarget}
          />
        </aside>
      </main>
    </div>
  );
}
