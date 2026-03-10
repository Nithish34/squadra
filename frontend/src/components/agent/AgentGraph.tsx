import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAgentStore, type Agent } from '@/store/agentStore';
import AgentNode from './AgentNode';

const nodeTypes = { agent: AgentNode };

export default function AgentGraph() {
  const agents = useAgentStore((s) => s.agents);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);

  const nodes: Node[] = useMemo(
    () =>
      agents.map((agent, i) => ({
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
      })),
    [agents]
  );

  const edges: Edge[] = useMemo(
    () => [
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
    ],
    [agents]
  );

  return (
    <div className="w-full h-[400px] rounded-xl border bg-card shadow-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background gap={20} size={1} color="hsl(340, 20%, 92%)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !rounded-lg !shadow-soft"
        />
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
