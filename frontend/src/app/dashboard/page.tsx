"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from 'framer-motion';
import { Cpu, Activity, LogOut, Settings, RefreshCw, Wifi, WifiOff, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/agentStore';
import { useAuthStore } from '@/store/authStore';
import { apiGetMissionState } from '@/lib/api';
import AgentGraph from '@/components/agent/AgentGraph';
import AgentLogPanel from '@/components/agent/AgentLogPanel';
import ScoutFindingsPanel from '@/components/agent/ScoutFindingsPanel';
import StrategyOutputPanel from '@/components/agent/StrategyOutputPanel';
import StatusBar from '@/components/agent/StatusBar';
import MissionPanel from '@/components/agent/MissionPanel';

export default function DashboardPage() {
    const router = useRouter();
    const { isAuthenticated, hasCompletedOnboarding, logout, name, profile } = useAuthStore();
    const {
        agents, missionId, pipelineStatus, isStreaming,
        applyPipelineState, connectStream, disconnectStream, reset,
    } = useAgentStore();

    const completedCount = agents.filter((a) => a.status === 'completed').length;

    // Auth guard
    useEffect(() => {
        if (!isAuthenticated) { router.replace('/auth'); }
        else if (!hasCompletedOnboarding) { router.replace('/onboarding'); }
    }, [isAuthenticated, hasCompletedOnboarding, router]);

    // If we have a missionId but no stream, reconnect on mount (page refresh)
    useEffect(() => {
        if (missionId && !isStreaming && pipelineStatus !== 'COMPLETE' && pipelineStatus !== 'FAILED') {
            // Poll final state first, then try reconnect
            apiGetMissionState(missionId)
                .then(applyPipelineState)
                .catch(() => {/* mission may have expired */ });

            if (pipelineStatus !== 'IDLE') {
                connectStream(missionId);
            }
        }
    }, []); // Only on first mount

    // Route to /review when Scout HITL gate fires
    useEffect(() => {
        if (pipelineStatus === 'WAITING_FOR_SCOUT_REVIEW' && missionId) {
            router.push(`/review?mission=${missionId}`);
        }
    }, [pipelineStatus, missionId, router]);

    const handleLogout = () => {
        disconnectStream();
        reset();
        logout();
        router.push('/');
    };

    if (!isAuthenticated || !hasCompletedOnboarding) return null;

    return (
        <div className="min-h-screen gradient-hero">
            {/* Header */}
            <header className="border-b glass sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
                            <Cpu className="w-4.5 h-4.5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-base text-foreground leading-tight">
                                War Room
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {profile?.companyName ?? 'Multi-Agent Orchestration System'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Stream indicator */}
                        <div className={`hidden md:flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${isStreaming ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-muted-foreground bg-muted'}`}>
                            {isStreaming ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            <span>{isStreaming ? 'SSE Live' : missionId ? 'Stream idle' : 'No mission'}</span>
                        </div>

                        {/* Agent progress */}
                        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            <span>{completedCount}/{agents.length} Completed</span>
                        </div>

                        {/* Reconnect button (only when mission exists but stream is idle) */}
                        {missionId && !isStreaming && pipelineStatus !== 'COMPLETE' && pipelineStatus !== 'FAILED' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => connectStream(missionId)}
                                className="gap-2 text-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                            </Button>
                        )}

                        <Link href="/missions">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Mission History"
                            >
                                <History className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/onboarding')}
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-6 space-y-6">
                {/* Status Bar */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <StatusBar />
                </motion.div>

                {/* Agent Graph */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full gradient-primary inline-block" />
                        Agent Trajectory Graph
                    </h2>
                    <div className="relative">
                        <AgentGraph />
                    </div>
                </motion.section>

                {/* Top Panels: Logs + Mission Setup */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full gradient-primary inline-block" />
                            Live Agent Stream
                        </h2>
                        <AgentLogPanel />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full gradient-primary inline-block" />
                            Mission Setup
                        </h2>
                        <MissionPanel />
                    </motion.div>
                </div>

                {/* Bottom Panels: Scout Findings + Strategy Output */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full gradient-primary inline-block" />
                            Scout Intelligence
                        </h2>
                        <ScoutFindingsPanel />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full gradient-primary inline-block" />
                            Strategy & Analysis
                        </h2>
                        <StrategyOutputPanel />
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
