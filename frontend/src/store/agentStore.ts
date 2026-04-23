/**
 * agentStore.ts — Real pipeline state driven by SSE stream.
 * No more setTimeout simulations — everything comes from the backend.
 */
import { create } from 'zustand';
import type { PipelineState, ScoutResult, AnalystResult, StrategistResult, StreamEvent } from '@/lib/api';
import { openMissionStream, apiGetMissionState } from '@/lib/api';

export type AgentStatus = 'idle' | 'running' | 'waiting_hitl' | 'completed' | 'error';

export interface AgentLog {
  id: string;
  timestamp: number;
  message: string;
  agent: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  progress: number;
}

// Map backend pipeline status → per-agent statuses
function deriveAgentStatuses(pipelineStatus: string): Record<string, AgentStatus> {
  const map: Record<string, Record<string, AgentStatus>> = {
    IDLE: { scout: 'idle', analyst: 'idle', strategist: 'idle' },
    SCOUT_RUNNING: { scout: 'running', analyst: 'idle', strategist: 'idle' },
    WAITING_FOR_SCOUT_REVIEW: { scout: 'waiting_hitl', analyst: 'idle', strategist: 'idle' },
    SCOUT_REVIEW_APPROVED: { scout: 'completed', analyst: 'idle', strategist: 'idle' },
    SCOUT_REVIEW_REJECTED: { scout: 'error', analyst: 'idle', strategist: 'idle' },
    ANALYST_RUNNING: { scout: 'completed', analyst: 'running', strategist: 'idle' },
    STRATEGIST_RUNNING: { scout: 'completed', analyst: 'completed', strategist: 'running' },
    PUBLISHING: { scout: 'completed', analyst: 'completed', strategist: 'completed' },
    COMPLETE: { scout: 'completed', analyst: 'completed', strategist: 'completed' },
    FAILED: { scout: 'error', analyst: 'error', strategist: 'error' },
  };
  return map[pipelineStatus] ?? { scout: 'idle', analyst: 'idle', strategist: 'idle' };
}

const initialAgents: Agent[] = [
  { id: 'scout', name: 'Scout Agent', role: 'Market Intelligence', status: 'idle', progress: 0 },
  { id: 'analyst', name: 'Analyst Agent', role: 'Data Processing', status: 'idle', progress: 0 },
  { id: 'strategist', name: 'Strategist Agent', role: 'Decision Engine', status: 'idle', progress: 0 },
];

interface AgentStore {
  // Active mission
  missionId: string | null;
  pipelineStatus: string;

  // Agent display state
  agents: Agent[];
  logs: AgentLog[];

  // Full pipeline results from backend
  scoutResult: ScoutResult | null;
  analystResult: AnalystResult | null;
  strategistResult: StrategistResult | null;
  publishLog: string[];

  // SSE
  eventSource: EventSource | null;
  isStreaming: boolean;

  // Actions
  setMission: (missionId: string) => void;
  connectStream: (missionId: string) => void;
  disconnectStream: () => void;
  applyPipelineState: (state: PipelineState) => void;
  handleSSEEvent: (event: StreamEvent) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  missionId: null as string | null,
  pipelineStatus: 'IDLE',
  agents: initialAgents,
  logs: [] as AgentLog[],
  scoutResult: null as ScoutResult | null,
  analystResult: null as AnalystResult | null,
  strategistResult: null as StrategistResult | null,
  publishLog: [] as string[],
  eventSource: null as EventSource | null,
  isStreaming: false,
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...INITIAL_STATE,

  setMission: (missionId) => set({ missionId }),

  connectStream: (missionId) => {
    // Close any existing stream
    get().disconnectStream();

    const es = openMissionStream(missionId);

    const fetchAndApplyState = async () => {
      try {
        const fullState = await apiGetMissionState(missionId);
        get().applyPipelineState(fullState);
      } catch { /* ignore — stream will continue */ }
    };

    const addLog = (agent: string, message: string) =>
      set((s) => ({
        // Cap at 200 to prevent unbounded growth (fixes slow 'thought' handler violations)
        logs: [
          ...s.logs.slice(-199),
          { id: crypto.randomUUID(), timestamp: Date.now(), message, agent },
        ],
      }));

    // thought — agent is processing, append to log
    es.addEventListener('thought', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        addLog(ev.agent, ev.data);
      } catch { /* ignore */ }
    });

    // status — pipeline status changed
    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        const newStatus = ev.data;
        const statuses = deriveAgentStatuses(newStatus);
        set((s) => ({
          pipelineStatus: newStatus,
          agents: s.agents.map((a) => ({
            ...a,
            status: statuses[a.id] ?? a.status,
            progress:
              statuses[a.id] === 'completed' ? 100 :
                statuses[a.id] === 'running' ? 50 :
                  statuses[a.id] === 'idle' ? 0 :
                    a.progress,
          })),
        }));
      } catch { /* ignore */ }
    });

    // graph_update — fine-grained node status (overrides status)
    es.addEventListener('graph_update', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        const payload = JSON.parse(ev.data) as { node_id: string; status: string; result_summary?: string };
        const statusMap: Record<string, AgentStatus> = {
          idle: 'idle', running: 'running', done: 'completed',
          error: 'error', hitl_paused: 'waiting_hitl',
        };
        const mapped: AgentStatus = statusMap[payload.status] ?? 'idle';
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === payload.node_id
              ? {
                ...a,
                status: mapped,
                progress: mapped === 'completed' ? 100 : mapped === 'running' ? 50 : mapped === 'idle' ? 0 : a.progress,
              }
              : a
          ),
        }));
        if (payload.result_summary) addLog(payload.node_id, payload.result_summary);
      } catch { /* ignore */ }
    });

    // handoff — agent-to-agent relay → fetch intermediate results (e.g. scout_result after Scout→Analyst)
    es.addEventListener('handoff', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        const payload = JSON.parse(ev.data) as { from_agent: string; to_agent: string; summary: string };
        addLog('system', `↳ ${payload.from_agent} → ${payload.to_agent}: ${payload.summary}`);
        // Mark from_agent completed, to_agent running
        set((s) => ({
          agents: s.agents.map((a) => {
            if (a.id === payload.from_agent) return { ...a, status: 'completed', progress: 100 };
            if (a.id === payload.to_agent) return { ...a, status: 'running', progress: 10 };
            return a;
          }),
        }));
        // ✅ Fetch the backend state to populate intermediate results (e.g. scout_result)
        fetchAndApplyState();
      } catch { /* ignore */ }
    });

    // scout_hitl_gate — Scout paused for human review
    es.addEventListener('scout_hitl_gate', (e: MessageEvent) => {
      try {
        set((s) => ({
          pipelineStatus: 'WAITING_FOR_SCOUT_REVIEW',
          agents: s.agents.map((a) =>
            a.id === 'scout' ? { ...a, status: 'waiting_hitl', progress: 100 } : a
          ),
        }));
        addLog('scout', '⏸ Paused — awaiting human review of findings');
        fetchAndApplyState(); // Load scout_result for HITL review UI
      } catch { /* ignore */ }
    });

    // publish_started / publish_complete
    es.addEventListener('publish_started', () => {
      addLog('system', '🚀 Publishing strategy to Shopify + Instagram...');
      set({ pipelineStatus: 'PUBLISHING' });
    });

    es.addEventListener('publish_complete', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        addLog('system', `✅ Published: ${ev.data}`);
      } catch { /* ignore */ }
    });

    // complete — stream ended → fetch FINAL full state with all results
    es.addEventListener('complete', () => {
      set((s) => ({
        pipelineStatus: 'COMPLETE',
        isStreaming: false,
        agents: s.agents.map((a) =>
          a.status === 'running' ? { ...a, status: 'completed', progress: 100 } : a
        ),
      }));
      // ✅ This is the critical fetch — populates scoutResult, analystResult, strategistResult
      fetchAndApplyState();
      es.close();
    });

    // error
    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);
        addLog('system', `❌ Error: ${ev.data}`);
        set({ pipelineStatus: 'FAILED', isStreaming: false });
      } catch { /* ignore */ }
    });

    set({ missionId, eventSource: es, isStreaming: true });
  },

  disconnectStream: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null, isStreaming: false });
    }
  },

  applyPipelineState: (state: PipelineState) => {
    const statuses = deriveAgentStatuses(state.status);
    set((s) => ({
      missionId: state.mission_id,
      pipelineStatus: state.status,
      scoutResult: state.scout_result,
      analystResult: state.analyst_result,
      strategistResult: state.strategist_result,
      publishLog: state.publish_log,
      agents: s.agents.map((a) => ({
        ...a,
        status: statuses[a.id] ?? a.status,
        progress:
          statuses[a.id] === 'completed' ? 100 :
            statuses[a.id] === 'running' ? 50 :
              a.progress,
      })),
    }));
  },

  handleSSEEvent: (event: StreamEvent) => {
    // Merge full strategist/analyst/scout results when available in event data
    try {
      if (event.event === 'complete') {
        // Fetch the final state via polling
      }
    } catch (error) {
      console.error("SSE Parse Error", error, event);
    }
  },

  reset: () => {
    get().disconnectStream();
    set({ ...INITIAL_STATE, agents: initialAgents.map(a => ({ ...a })) });
  },
}));
