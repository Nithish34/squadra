import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Search, BarChart3, Brain, Clock } from 'lucide-react';
import type { AgentStatus } from '@/store/agentStore';

const iconMap: Record<string, React.ElementType> = {
  scout: Search,
  analyst: BarChart3,
  strategist: Brain,
};

const statusStyles: Record<AgentStatus, string> = {
  idle: 'border-border bg-card',
  running: 'border-primary bg-pink-soft shadow-elevated animate-pulse-ring',
  waiting_hitl: 'border-warning bg-amber-50 shadow-elevated',
  completed: 'border-emerald-400 bg-emerald-50 shadow-soft',
  error: 'border-destructive bg-red-50',
};

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  waiting_hitl: 'Awaiting Review',
  completed: 'Completed',
  error: 'Error',
};

const progressBarColors: Record<AgentStatus, string> = {
  idle: 'bg-muted-foreground/30',
  running: 'gradient-primary',
  waiting_hitl: 'bg-amber-400',
  completed: 'bg-emerald-400',
  error: 'bg-destructive',
};

interface AgentNodeData {
  label: string;
  role: string;
  agentId: string;
  status: AgentStatus;
  progress: number;
}

function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const Icon = iconMap[data.agentId] || Brain;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`rounded-xl border-2 p-4 min-w-[190px] transition-all duration-300 ${statusStyles[data.status]}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${data.status === 'completed' ? 'bg-emerald-100' : data.status === 'waiting_hitl' ? 'bg-amber-100' : 'gradient-primary'}`}>
          {data.status === 'waiting_hitl'
            ? <Clock className="w-4 h-4 text-amber-600" />
            : <Icon className={`w-4 h-4 ${data.status === 'completed' ? 'text-emerald-600' : 'text-primary-foreground'}`} />
          }
        </div>
        <div>
          <p className="font-display font-semibold text-sm text-foreground">{data.label}</p>
          <p className="text-xs text-muted-foreground">{data.role}</p>
        </div>
      </div>

      {data.status !== 'idle' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{statusLabels[data.status]}</span>
            <span className="font-medium text-foreground">{data.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progressBarColors[data.status]}`}
              initial={{ width: 0 }}
              animate={{ width: `${data.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </motion.div>
  );
}

export default memo(AgentNode);
