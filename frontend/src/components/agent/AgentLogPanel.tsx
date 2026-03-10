"use client";

import React from 'react';
import { useAgentStore } from '@/store/agentStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BarChart3, Brain, Settings2, Cpu } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  scout: Search,
  analyst: BarChart3,
  strategist: Brain,
  system: Cpu,
};

const agentColor: Record<string, string> = {
  scout: 'gradient-primary',
  analyst: 'bg-blue-500',
  strategist: 'bg-violet-500',
  system: 'bg-slate-400',
};

export default function AgentLogPanel() {
  const logs = useAgentStore((s) => s.logs);
  const isStreaming = useAgentStore((s) => s.isStreaming);

  return (
    <div className="rounded-xl border bg-card shadow-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground text-sm">Live Agent Stream</h3>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Streaming
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 h-[280px]">
        <div className="space-y-2 pr-2">
          <AnimatePresence initial={false}>
            {logs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Launch a mission to see live agent thoughts stream here…
              </p>
            )}
            {logs.map((log) => {
              const Icon = iconMap[log.agent] || Cpu;
              const color = agentColor[log.agent] || 'bg-slate-400';
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 text-xs"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground capitalize">{log.agent}: </span>
                    <span className="text-muted-foreground break-words">{log.message}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
