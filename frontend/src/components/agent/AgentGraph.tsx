"use client";

import { useEffect, useState, useMemo, memo } from 'react';
import ReactFlow, {
  Background,
  type Node,
  type Edge,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAgentStore, type Agent } from '@/store/agentStore';
import { apiGetGraph, type GraphResponse } from '@/lib/api';
import AgentNode from './AgentNode';
import { Loader2, AlertCircle } from 'lucide-react';

const nodeTypes = { agent: AgentNode };

// ── Map backend graph node status → AgentStatus ──────────────────────────────
const backendStatusMap: Record<string, string> = {
  idle: 'idle',
  running: 'running',
  done: 'completed',
  error: 'error',
  hitl_paused: 'waiting_hitl',
};

const roleLabels: Record<string, string> = {
  scout: 'Market Intelligence',
  analyst: 'Data Processing',
  strategist: 'Decision Engine',
};

/** Convert backend GraphNode → ReactFlow Node */
function toFlowNode(gn: GraphResponse['nodes'][number], idx: number): Node {
  const agentStatus = backendStatusMap[gn.data.status] ?? 'idle';
  const progress =
    agentStatus === 'completed' ? 100 :
    agentStatus === 'running' ? 50 :
    agentStatus === 'waiting_hitl' ? 100 : 0;

  return {
    id: gn.id,
    type: 'agent',
    position: gn.position,
    data: {
      label: gn.data.label,
      role: roleLabels[gn.data.role] ?? gn.data.role,
      agentId: gn.id,
      status: agentStatus,
      progress,
    },
  };
}

/** Convert backend GraphEdge → ReactFlow Edge */
function toFlowEdge(ge: GraphResponse['edges'][number]): Edge {
  return {
    id: ge.id,
    source: ge.source,
    target: ge.target,
    type: ge.type ?? 'smoothstep',
    animated: ge.animated,
    label: ge.label,
    style: {
      stroke: ge.style?.stroke ?? 'hsl(340, 65%, 65%)',
      strokeWidth: 2,
      ...(ge.style?.strokeDasharray ? { strokeDasharray: ge.style.strokeDasharray } : {}),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: ge.style?.stroke ?? 'hsl(340, 65%, 65%)',
    },
    labelStyle: { fontSize: 10, fill: 'hsl(340, 30%, 50%)' },
    labelBgStyle: { fill: 'hsl(340, 40%, 97%)' },
  };
}

// ── Local-store fallback (when no mission is active) ─────────────────────────
function localAgentNodes(agents: Agent[]): Node[] {
  return agents.map((agent, i) => ({
    id: agent.id,
    type: 'agent',
    position: { x: 80 + i * 280, y: 120 + (i % 2 === 1 ? 60 : 0) },
    data: {
      label: agent.name,
      role: agent.role,
      agentId: agent.id,
      status: agent.status,
      progress: agent.progress,
    },
  }));
}

function localAgentEdges(agents: Agent[]): Edge[] {
  return [
    {
      id: 'scout-analyst',
      source: 'scout',
      target: 'analyst',
      type: 'smoothstep',
      animated: agents[0]?.status === 'running' || agents[1]?.status === 'running',
      style: { stroke: 'hsl(340, 65%, 65%)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(340, 65%, 65%)' },
      label: agents[0]?.status === 'completed' ? '✓ Findings' : undefined,
      labelStyle: { fontSize: 10, fill: 'hsl(340, 30%, 50%)' },
      labelBgStyle: { fill: 'hsl(340, 40%, 97%)' },
    },
    {
      id: 'analyst-strategist',
      source: 'analyst',
      target: 'strategist',
      type: 'smoothstep',
      animated: agents[1]?.status === 'running' || agents[2]?.status === 'running',
      style: { stroke: 'hsl(340, 65%, 65%)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(340, 65%, 65%)' },
      label: agents[1]?.status === 'completed' ? '✓ Analysis' : undefined,
      labelStyle: { fontSize: 10, fill: 'hsl(340, 30%, 50%)' },
      labelBgStyle: { fill: 'hsl(340, 40%, 97%)' },
    },
  ];
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgentGraph() {
  const agents = useAgentStore((s) => s.agents);
  const missionId = useAgentStore((s) => s.missionId);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);

  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch server-driven graph whenever mission or pipeline status changes
  useEffect(() => {
    if (!missionId) {
      setGraphData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGetGraph(missionId)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load graph');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [missionId, pipelineStatus]);

  // Build ReactFlow nodes/edges — server data wins, fall back to local store
  const nodes: Node[] = useMemo(() => {
    if (graphData) return graphData.nodes.map(toFlowNode);
    return localAgentNodes(agents);
  }, [graphData, agents]);

  const edges: Edge[] = useMemo(() => {
    if (graphData) return graphData.edges.map(toFlowEdge);
    return localAgentEdges(agents);
  }, [graphData, agents]);

  return (
    <div className="w-full h-[400px] rounded-xl border bg-card shadow-card overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/70 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading graph…</span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-1.5 shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Mode badge — only when server graph is available */}
      {graphData && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {graphData.mode === 'SCOUT_HITL' && (
            <span className="text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-600 rounded-full px-2 py-0.5">
              SCOUT HITL
            </span>
          )}
          {graphData.mode === 'AUTONOMOUS' && (
            <span className="text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full px-2 py-0.5">
              AUTONOMOUS
            </span>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background gap={20} size={1} color="hsl(340, 20%, 92%)" />
      </ReactFlow>

      {/* Pipeline status footer */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent flex items-end justify-center pb-2 pointer-events-none">
        <span className="text-xs text-muted-foreground font-mono">
          {pipelineStatus !== 'IDLE' && `Pipeline: ${pipelineStatus.replace(/_/g, ' ')}`}
        </span>
      </div>
    </div>
  );
}
