"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, CheckCircle2, XCircle, Loader2, ShieldCheck,
    Edit3, Eye, EyeOff, AlertCircle, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useAgentStore } from "@/store/agentStore";
import {
    apiGetReviewState, apiSubmitScoutReview,
    type HITLReviewState, type ScoutFinding
} from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

const findingTypeLabels: Record<string, string> = {
    price_change: "Price Change",
    new_product: "New Product",
    promotion: "Promotion",
};

export default function ReviewPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const missionIdParam = searchParams.get("mission");
    const { isAuthenticated, hasCompletedOnboarding } = useAuthStore();
    const { missionId: storeMissionId, connectStream } = useAgentStore();

    const missionId = missionIdParam || storeMissionId;

    const [reviewState, setReviewState] = useState<HITLReviewState | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [findings, setFindings] = useState<ScoutFinding[]>([]);
    const [showExcluded, setShowExcluded] = useState(false);
    const [reviewerNote, setReviewerNote] = useState("");

    useEffect(() => {
        if (!isAuthenticated) { router.replace("/auth"); return; }
        if (!hasCompletedOnboarding) { router.replace("/onboarding"); return; }
    }, [isAuthenticated, hasCompletedOnboarding, router]);

    useEffect(() => {
        if (!missionId) return;
        let interval: ReturnType<typeof setInterval>;
        const poll = async () => {
            try {
                const state = await apiGetReviewState(missionId);
                setReviewState(state);
                if (state.scout_result?.findings && findings.length === 0) {
                    setFindings(state.scout_result.findings);
                }
                if (
                    state.pipeline_status !== "WAITING_FOR_SCOUT_REVIEW" &&
                    state.pipeline_status !== "IDLE" &&
                    state.pipeline_status !== "SCOUT_RUNNING" &&
                    !success
                ) {
                    clearInterval(interval);
                    if (state.pipeline_status === "SCOUT_REVIEW_REJECTED") {
                        setSuccess("Review rejected — pipeline halted.");
                    } else {
                        setSuccess("Approved! Agents are now running analysis…");
                        setTimeout(() => router.push("/dashboard"), 2000);
                    }
                }
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load review state.");
                setLoading(false);
            }
        };
        poll();
        interval = setInterval(poll, 4000);
        return () => clearInterval(interval);
    }, [missionId]);

    const toggleFinding = (idx: number) =>
        setFindings((prev) => prev.map((f, i) => (i === idx ? { ...f, included: !f.included } : f)));

    const includedCount = findings.filter((f) => f.included).length;
    const visibleFindings = showExcluded ? findings : findings.filter((f) => f.included);

    const handleApprove = async () => {
        if (!missionId) return;
        setSubmitting(true); setError(null);
        try {
            await apiSubmitScoutReview(missionId, true, findings, reviewerNote || undefined);
            connectStream(missionId);
            setSuccess("Approved! Analyst is now running…");
            setTimeout(() => router.push("/dashboard"), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Submission failed.");
        } finally { setSubmitting(false); }
    };

    const handleReject = async () => {
        if (!missionId) return;
        setSubmitting(true); setError(null);
        try {
            await apiSubmitScoutReview(missionId, false, undefined, reviewerNote || undefined);
            setSuccess("Rejected — pipeline halted.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Submission failed.");
        } finally { setSubmitting(false); }
    };

    if (!missionId) {
        return (
            <div className="min-h-screen gradient-hero flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-semibold mb-2">No mission selected</p>
                    <Link href="/dashboard" className="text-primary text-sm hover:underline flex items-center gap-1 justify-center">
                        Back to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-hero">
            <header className="border-b glass sticky top-0 z-50">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shadow-soft">
                            <ShieldCheck className="w-4.5 h-4.5 text-amber-600" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-base text-foreground leading-tight">Scout HITL Review</h1>
                            <p className="text-xs text-muted-foreground font-mono">{missionId}</p>
                        </div>
                    </div>
                    <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        ← Dashboard
                    </Link>
                </div>
            </header>

            <main className="container py-8 max-w-4xl">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AnimatePresence>
                            {success && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <p className="text-sm font-semibold text-emerald-800">{success}</p>
                                </motion.div>
                            )}
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <p className="text-sm font-semibold text-red-700">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header card */}
                        <div className="glass rounded-2xl border border-border/60 p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-6 h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-display font-bold text-xl text-foreground mb-1">Scout findings ready for review</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        The Scout agent has collected {findings.length} intelligence findings. Review, edit, or exclude individual findings before passing them to the Analyst.
                                    </p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">{includedCount} included</span>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{findings.length - includedCount} excluded</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Findings list */}
                        <div className="glass rounded-2xl border border-border/60 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                                        <Search className="w-3.5 h-3.5 text-primary-foreground" />
                                    </div>
                                    <h3 className="font-display font-semibold text-foreground text-sm">Intelligence Findings</h3>
                                </div>
                                <button onClick={() => setShowExcluded((v) => !v)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    {showExcluded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showExcluded ? "Hide excluded" : "Show all"}
                                </button>
                            </div>
                            <ScrollArea className="h-[480px]">
                                <div className="p-5 space-y-3">
                                    {visibleFindings.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">All findings have been excluded.</p>
                                    )}
                                    {visibleFindings.map((finding) => {
                                        const realIdx = findings.indexOf(finding);
                                        return (
                                            <motion.div key={realIdx} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                className={`rounded-xl border p-4 transition-all ${!finding.included ? 'opacity-50 bg-muted/30' : 'bg-background'}`}>
                                                <div className="flex items-start gap-3">
                                                    <button onClick={() => toggleFinding(realIdx)}
                                                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${finding.included ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'}`}>
                                                        {finding.included && <CheckCircle2 className="w-3 h-3" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-xs font-semibold text-foreground">{finding.competitor_name}</span>
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                                                                {findingTypeLabels[finding.finding_type] ?? finding.finding_type}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-foreground mb-1">{finding.title}</p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{finding.detail}</p>
                                                        {(finding.price_before !== null || finding.price_after !== null) && (
                                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                                {finding.price_before && <span className="line-through text-muted-foreground">₹{finding.price_before}</span>}
                                                                {finding.price_after && <span className="font-bold text-foreground">→ ₹{finding.price_after}</span>}
                                                                {finding.price_before && finding.price_after && (
                                                                    <span className={finding.price_after < finding.price_before ? 'text-red-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                                                                        ({finding.price_after < finding.price_before ? '↓' : '↑'}
                                                                        {Math.abs(((finding.price_after - finding.price_before) / finding.price_before) * 100).toFixed(1)}%)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Reviewer note */}
                        <div className="glass rounded-2xl border border-border/60 p-5">
                            <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5" /> Reviewer Note (optional)
                            </label>
                            <textarea value={reviewerNote} onChange={(e) => setReviewerNote(e.target.value)}
                                placeholder="Add context or instructions for the Analyst agent…"
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={handleReject} disabled={submitting || !!success}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-semibold text-sm disabled:opacity-50">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject & Halt Pipeline
                            </button>
                            <button onClick={handleApprove} disabled={submitting || includedCount === 0 || !!success}
                                className="flex items-center gap-2 gradient-primary text-primary-foreground font-bold px-7 py-3 rounded-xl shadow-soft hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Approve {includedCount} Finding{includedCount !== 1 ? 's' : ''} & Continue
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
