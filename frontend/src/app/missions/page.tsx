"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu, Clock, MapPin, Tag, Users, Target,
    LogOut, Plus, ChevronRight, RefreshCw,
    Loader2, AlertCircle, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useAgentStore } from "@/store/agentStore";
import { apiGetMissions, apiGetMissionState, type MissionListItem } from "@/lib/api";

const statusColor: Record<string, string> = {
    COMPLETE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
    WAITING_FOR_SCOUT_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
    SCOUT_RUNNING: "bg-blue-100 text-blue-700 border-blue-200",
    ANALYST_RUNNING: "bg-purple-100 text-purple-700 border-purple-200",
    STRATEGIST_RUNNING: "bg-pink-100 text-pink-700 border-pink-200",
    IDLE: "bg-gray-100 text-gray-600 border-gray-200",
};

function statusLabel(status: string) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(isoDate: string) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function MissionsPage() {
    const router = useRouter();
    const { isAuthenticated, hasCompletedOnboarding, logout, name, profile } = useAuthStore();
    const { applyPipelineState, connectStream, reset, pipelineStatus } = useAgentStore();

    const [missions, setMissions] = useState<MissionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resuming, setResuming] = useState<string | null>(null);

    // Auth guard
    useEffect(() => {
        if (!isAuthenticated) router.replace("/auth");
        else if (!hasCompletedOnboarding) router.replace("/onboarding");
    }, [isAuthenticated, hasCompletedOnboarding, router]);

    // Fetch missions
    const fetchMissions = () => {
        setLoading(true);
        setError(null);
        apiGetMissions()
            .then((res) => setMissions(res.missions))
            .catch((err) => setError(err.message ?? "Failed to load missions"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isAuthenticated && hasCompletedOnboarding) fetchMissions();
    }, [isAuthenticated, hasCompletedOnboarding]);

    const handleResume = async (missionId: string) => {
        setResuming(missionId);
        try {
            const state = await apiGetMissionState(missionId);
            applyPipelineState(state);
            // Reconnect stream if still in-progress
            if (!["COMPLETE", "FAILED"].includes(state.status)) {
                connectStream(missionId);
            }
            router.push("/dashboard");
        } catch (err: any) {
            setError(`Failed to resume mission: ${err.message}`);
            setResuming(null);
        }
    };

    const handleNewMission = () => {
        reset();
        router.push("/onboarding");
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
                                Mission History
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {profile?.companyName ?? "All past intelligence missions"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchMissions}
                            disabled={loading}
                            className="gap-2 text-xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            className="gap-2 text-xs gradient-primary text-primary-foreground border-0 shadow-soft"
                            onClick={handleNewMission}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Mission
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { logout(); router.push("/"); }}
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-8">
                {/* Welcome strip */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center justify-between"
                >
                    <div>
                        <h2 className="font-display text-2xl font-bold text-foreground">
                            {name ? `Welcome back, ${name.split(" ")[0]}` : "Your Missions"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {missions.length > 0
                                ? `${missions.length} mission${missions.length !== 1 ? "s" : ""} found — click any to resume`
                                : "No missions yet. Launch your first one below."}
                        </p>
                    </div>

                    {missions.length > 0 && (
                        <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                            <Target className="w-3.5 h-3.5" />
                            {missions.length} total
                        </span>
                    )}
                </motion.div>

                {/* Error */}
                {error && (
                    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-border bg-card animate-pulse h-48" />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && missions.length === 0 && !error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-24 gap-4 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-elevated">
                            <Inbox className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <h3 className="font-display text-lg font-bold text-foreground">No missions yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Launch your first intelligence mission to start tracking your market and competitors.
                        </p>
                        <Button
                            className="gap-2 gradient-primary text-primary-foreground border-0 shadow-soft mt-2"
                            onClick={handleNewMission}
                        >
                            <Plus className="w-4 h-4" />
                            Launch First Mission
                        </Button>
                    </motion.div>
                )}

                {/* Mission cards */}
                {!loading && missions.length > 0 && (
                    <AnimatePresence>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {missions.map((mission, i) => (
                                <motion.div
                                    key={mission.mission_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group relative rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated hover:border-primary/40 transition-all duration-300 overflow-hidden cursor-pointer"
                                    onClick={() => !resuming && handleResume(mission.mission_id)}
                                >
                                    {/* Hover glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    <div className="p-5">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-display font-bold text-sm text-foreground truncate">
                                                    {mission.business_name || "Unnamed Business"}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    {mission.niche || "–"}
                                                </p>
                                            </div>
                                            {resuming === mission.mission_id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0 ml-2" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                                            )}
                                        </div>

                                        {/* Meta chips */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {mission.city && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground rounded-md px-2 py-0.5">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {mission.city}{mission.country ? `, ${mission.country}` : ""}
                                                </span>
                                            )}
                                            {(mission.competitors?.length ?? 0) > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground rounded-md px-2 py-0.5">
                                                    <Users className="w-2.5 h-2.5" />
                                                    {mission.competitors.length} competitor{mission.competitors.length !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {(mission.keywords?.length ?? 0) > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground rounded-md px-2 py-0.5">
                                                    <Tag className="w-2.5 h-2.5" />
                                                    {mission.keywords.length} keyword{mission.keywords.length !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-border">
                                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(mission.created_at)}
                                            </span>
                                            <span className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[120px]">
                                                {mission.mission_id.slice(0, 8)}…
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </main>
        </div>
    );
}
