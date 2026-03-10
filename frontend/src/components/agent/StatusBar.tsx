import React from 'react';
import { useAgentStore, type AgentStatus } from '@/store/agentStore';
import { motion } from 'framer-motion';
import { Search, BarChart3, Brain } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  scout: Search,
  analyst: BarChart3,
  strategist: Brain,
};

const statusDot: Record<AgentStatus, string> = {
  idle: 'bg-muted-foreground/40',
  running: 'bg-primary animate-pulse',
  waiting_hitl: 'bg-warning animate-pulse',
  completed: 'bg-emerald-500',
  error: 'bg-destructive',
};

const statusLabel: Record<AgentStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  waiting_hitl: 'Awaiting Review',
  completed: 'Done',
  error: 'Error',
};

export default function StatusBar() {
  const agents = useAgentStore((s) => s.agents);
  const pipelineStatus = useAgentStore((s) => s.pipelineStatus);
  const missionId = useAgentStore((s) => s.missionId);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        {agents.map((agent) => {
          const Icon = iconMap[agent.id] || Brain;
          return (
            <motion.div
              key={agent.id}
              className="flex items-center gap-2 rounded-lg bg-card border px-3 py-2 shadow-soft"
              whileHover={{ scale: 1.02 }}
            >
              <div className={`w-2 h-2 rounded-full ${statusDot[agent.status]}`} />
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <span className="text-xs font-medium text-foreground">{agent.name}</span>
                <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">
                  {statusLabel[agent.status]}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {missionId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span className="font-mono truncate max-w-[180px]">{missionId}</span>
          <span className="text-border">|</span>
          <span className={`font-medium ${pipelineStatus === 'COMPLETE' ? 'text-emerald-600' : pipelineStatus === 'FAILED' ? 'text-destructive' : 'text-foreground'}`}>
            {pipelineStatus.replace(/_/g, ' ')}
          </span>
        </div>
      )}
    </div>
  );
}
