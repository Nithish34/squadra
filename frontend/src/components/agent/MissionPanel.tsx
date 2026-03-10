"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Rocket, Plus, Trash2, Globe, ChevronDown,
    Loader2, CheckCircle2, AlertCircle, Package,
    ShieldCheck, Zap, X, ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAgentStore } from "@/store/agentStore";
import { apiCreateMission } from "@/lib/api";

interface Competitor { id: string; name: string; url: string; }

const NICHE_OPTIONS = [
    { value: "ecommerce", label: "E-Commerce" },
    { value: "local_services", label: "Local Services" },
    { value: "food_beverage", label: "Food & Beverage" },
    { value: "fashion", label: "Fashion" },
    { value: "electronics", label: "Electronics" },
];

const emptyCompetitor = (): Competitor => ({
    id: crypto.randomUUID(), name: "", url: "",
});

interface MissionResult { mission_id: string; mode: string; status: string; message: string; }

export default function MissionPanel() {
    const profile = useAuthStore((s) => s.profile);
    const { connectStream, reset } = useAgentStore();

    const [businessName, setBusinessName] = useState(profile?.companyName ?? "");
    const [niche, setNiche] = useState("ecommerce");
    const [city, setCity] = useState("Coimbatore");
    const [hitl, setHitl] = useState(false);
    const [competitors, setCompetitors] = useState<Competitor[]>([emptyCompetitor()]);
    const [keywords, setKeywords] = useState(
        profile?.products.map((p) => p.name).join(", ") ?? ""
    );
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const [launching, setLaunching] = useState(false);
    const [result, setResult] = useState<MissionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const addCompetitor = () => setCompetitors((c) => [...c, emptyCompetitor()]);
    const removeCompetitor = (id: string) =>
        setCompetitors((c) => (c.length > 1 ? c.filter((x) => x.id !== id) : c));
    const updateCompetitor = (id: string, field: keyof Competitor, value: string) =>
        setCompetitors((c) => c.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

    const toggleProduct = (id: string) =>
        setSelectedProductIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const validCompetitors = competitors.filter((c) => c.name.trim() && c.url.trim());
    const canLaunch = businessName.trim() && validCompetitors.length > 0;

    const handleLaunch = async () => {
        setLaunching(true);
        setError(null);
        setResult(null);
        reset(); // clear previous mission state

        try {
            const data = await apiCreateMission({
                business_name: businessName.trim(),
                niche,
                city: city.trim() || "Coimbatore",
                country: "IN",
                competitors: validCompetitors.map(({ name, url }) => ({ name, url })),
                keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
                shopify_product_ids: selectedProductIds,
                instagram_post: true,
                enable_scout_hitl: hitl,
            });
            setResult(data);
            // Connect SSE stream immediately after mission is created
            connectStream(data.mission_id);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error launching mission.";
            if (msg.includes("401")) setError("Session expired — please sign in again.");
            else if (msg.includes("422")) setError("Invalid mission config. Check competitor URLs.");
            else setError(msg);
        } finally {
            setLaunching(false);
        }
    };

    return (
        <div className="glass rounded-2xl border border-border/60 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-soft">
                        <Rocket className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="font-display font-semibold text-foreground text-sm leading-tight">Mission Setup</h2>
                        <p className="text-xs text-muted-foreground">Configure & launch your AI agents</p>
                    </div>
                </div>
                {result && (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Live
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3"
                        >
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-green-800">Mission launched!</p>
                                <p className="text-xs text-green-700 mt-0.5 font-mono break-all">
                                    ID: {result.mission_id} · {result.mode} · SSE stream active
                                </p>
                            </div>
                            <button onClick={() => setResult(null)} className="text-green-500 hover:text-green-700 flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3"
                        >
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-red-700">Launch failed</p>
                                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Business name + Niche */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Business Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="mission-business-name"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g. Acme Consumer Goods"
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Niche</label>
                        <div className="relative">
                            <select
                                id="mission-niche"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                className="w-full appearance-none px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition pr-8"
                            >
                                {NICHE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Competitors */}
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Competitors <span className="text-red-400">*</span>
                        <span className="ml-1 text-muted-foreground/60 font-normal">(min 1 required)</span>
                    </label>
                    <div className="space-y-2">
                        {competitors.map((c) => (
                            <div key={c.id} className="flex gap-2 items-center">
                                <input
                                    value={c.name}
                                    onChange={(e) => updateCompetitor(c.id, "name", e.target.value)}
                                    placeholder="Brand name"
                                    className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                />
                                <div className="relative flex-[2]">
                                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                    <input
                                        value={c.url}
                                        onChange={(e) => updateCompetitor(c.id, "url", e.target.value)}
                                        placeholder="https://competitor.com"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                    />
                                </div>
                                <button
                                    onClick={() => removeCompetitor(c.id)}
                                    disabled={competitors.length === 1}
                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded disabled:opacity-30"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addCompetitor}
                            disabled={competitors.length >= 10}
                            className="w-full py-2 rounded-xl border-2 border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Competitor
                        </button>
                    </div>
                </div>

                {/* Products from onboarding */}
                {profile?.products && profile.products.length > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Your Products
                            <span className="ml-1 font-normal text-muted-foreground/60">(select to track on Shopify)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {profile.products.map((p) => {
                                const selected = selectedProductIds.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toggleProduct(p.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs ${selected
                                            ? "border-primary/50 bg-primary/8 text-primary font-medium"
                                            : "border-border bg-background text-foreground hover:border-primary/30"
                                            }`}
                                    >
                                        <Package className={`w-3 h-3 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                                        <span className="truncate">{p.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Advanced toggle */}
                <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                    <span className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                    Advanced options
                </button>

                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
                                <input
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. Mumbai"
                                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    Keywords <span className="ml-1 font-normal text-muted-foreground/60">(comma-separated)</span>
                                </label>
                                <input
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="e.g. hand wash, personal care, antibacterial"
                                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                                />
                            </div>

                            {/* HITL toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Scout HITL Mode</p>
                                        <p className="text-xs text-muted-foreground">Pause after Scout for human review at /review</p>
                                    </div>
                                </div>
                                <button
                                    id="hitl-toggle"
                                    onClick={() => setHitl((h) => !h)}
                                    className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${hitl ? "bg-primary" : "bg-border"}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${hitl ? "left-6" : "left-1"}`} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mode badge + Launch */}
                <div className="flex items-center gap-3 pt-1">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${hitl ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                        {hitl ? <ShieldCheck className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                        {hitl ? "Scout HITL" : "Autonomous"}
                    </div>
                    <div className="flex-1" />
                    <button
                        id="launch-mission-btn"
                        onClick={handleLaunch}
                        disabled={!canLaunch || launching}
                        className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-soft hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {launching ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
                        ) : (
                            <><Rocket className="w-4 h-4" /> Launch Mission</>
                        )}
                    </button>
                </div>

                {!canLaunch && !launching && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Add a business name and at least one competitor with a URL to launch.
                    </p>
                )}
            </div>
        </div>
    );
}
