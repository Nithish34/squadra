"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Bot,
    CheckCircle2,
    Globe,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};


const features = [
    {
        icon: Bot,
        title: "Multi-Agent Orchestration",
        description: "Deploy a fleet of specialized AI agents — Scout, Analyst, Strategist & Executor — that work in concert to automate your market intelligence pipeline.",
    },
    {
        icon: TrendingUp,
        title: "Real-Time Competitor Tracking",
        description: "Monitor competitor pricing, product launches, and positioning shifts across every channel. Always stay one step ahead.",
    },
    {
        icon: BarChart3,
        title: "Dynamic Pricing Intelligence",
        description: "Run price elasticity models and identify optimization opportunities automatically, with one-click approval for instant action.",
    },
    {
        icon: Globe,
        title: "Omni-Channel Coverage",
        description: "Capture signals from retail, e-commerce, social media and distributor networks — all unified in a single intelligence feed.",
    },
    {
        icon: ShieldCheck,
        title: "Human-in-the-Loop Controls",
        description: "Every critical decision requires your sign-off. The platform flags checkpoints for review so you stay in control without the grunt work.",
    },
    {
        icon: Zap,
        title: "Instant Actionability",
        description: "From insight to action in minutes. Approved strategies are pushed directly to your execution channels — no manual handoffs.",
    },
];

const stats = [
    { value: "3×", label: "Faster insights" },
    { value: "40%", label: "Lower research cost" },
    { value: "99%", label: "Data accuracy" },
    { value: "24/7", label: "Autonomous monitoring" },
];

const steps = [
    { num: "01", title: "Connect your products", desc: "Tell us about your company and the products you sell in minutes." },
    { num: "02", title: "Agents go to work", desc: "Our AI fleet scans thousands of data points across your competitive landscape." },
    { num: "03", title: "Review & approve", desc: "Get clear insights and pricing recommendations — approve in one click." },
    { num: "04", title: "Execute with confidence", desc: "Strategies are deployed automatically, with full audit trails." },
];

export default function LandingPage() {
    // Only read auth state after mount to avoid hydration mismatch
    const [mounted, setMounted] = useState(false);
    const { isAuthenticated, hasCompletedOnboarding } = useAuthStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    const targetRoute = mounted && isAuthenticated
        ? (hasCompletedOnboarding ? "/dashboard" : "/onboarding")
        : "/auth?tab=signup";

    return (
        <div className="min-h-screen bg-[hsl(340,30%,98%)] text-[hsl(340,25%,15%)] overflow-x-hidden">

            {/* --- NAV --- */}
            <nav className="sticky top-0 z-50 border-b border-[hsl(340,25%,90%)] bg-[hsl(340,30%,98%)]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] flex items-center justify-center shadow-md">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            MarketMind<span className="text-[hsl(340,65%,65%)]">AI</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {mounted && isAuthenticated ? (
                            <Link
                                href={hasCompletedOnboarding ? "/dashboard" : "/onboarding"}
                                suppressHydrationWarning
                                className="text-sm font-semibold bg-gradient-to-r from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth"
                                    suppressHydrationWarning
                                    className="text-sm text-[hsl(340,25%,40%)] hover:text-[hsl(340,65%,65%)] transition-colors px-3 py-1.5"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/auth?tab=signup"
                                    suppressHydrationWarning
                                    className="text-sm font-semibold bg-gradient-to-r from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- HERO --- */}
            <section className="relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-b from-[hsl(340,65%,65%,0.12)] to-transparent blur-3xl" />
                    <div className="absolute top-24 right-10 w-72 h-72 rounded-full bg-[hsl(340,70%,72%,0.08)] blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[hsl(210,70%,55%,0.06)] blur-2xl" />
                </div>

                <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={fadeUp}
                        className="inline-flex items-center gap-2 bg-[hsl(340,40%,95%)] border border-[hsl(340,30%,88%)] text-[hsl(340,55%,50%)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI-Powered Market Intelligence Platform
                    </motion.div>

                    <motion.h1
                        initial="hidden"
                        animate="show"
                        custom={1}
                        variants={fadeUp}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Know your market.
                        <br />
                        <span className="bg-gradient-to-r from-[hsl(340,65%,62%)] via-[hsl(340,70%,68%)] to-[hsl(270,60%,65%)] bg-clip-text text-transparent">
                            Beat your rivals.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial="hidden"
                        animate="show"
                        custom={2}
                        variants={fadeUp}
                        className="text-lg md:text-xl text-[hsl(340,10%,45%)] max-w-2xl mx-auto mb-10 leading-relaxed"
                    >
                        MarketMind AI deploys autonomous agents to scan competitors, model pricing strategies, and surface actionable intelligence — all in real time, 24/7.
                    </motion.p>

                    <motion.div
                        initial="hidden"
                        animate="show"
                        custom={3}
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href={targetRoute}
                            suppressHydrationWarning
                            className="group inline-flex items-center gap-2 bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base"
                        >
                            {mounted && isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#how-it-works"
                            suppressHydrationWarning
                            className="inline-flex items-center gap-2 text-[hsl(340,25%,35%)] font-medium px-6 py-3.5 rounded-xl border border-[hsl(340,25%,88%)] hover:bg-[hsl(340,30%,96%)] transition-colors text-base"
                        >
                            See how it works
                        </a>
                    </motion.div>
                </div>

                {/* Dashboard preview */}
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                    className="max-w-6xl mx-auto px-6 pb-0"
                >
                    <div className="relative rounded-2xl border border-[hsl(340,25%,88%)] bg-white/70 backdrop-blur-sm shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(340,30%,98%,0.9)] pointer-events-none z-10" />
                        {/* Fake browser bar */}
                        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[hsl(340,20%,92%)] bg-[hsl(340,30%,98%)]">
                            <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,70%)]" />
                            <div className="w-3 h-3 rounded-full bg-[hsl(38,90%,65%)]" />
                            <div className="w-3 h-3 rounded-full bg-[hsl(130,55%,60%)]" />
                            <div className="flex-1 mx-4 bg-[hsl(340,20%,94%)] rounded-md h-6 flex items-center px-3">
                                <span className="text-[10px] text-[hsl(340,10%,55%)]">app.marketmind.ai/dashboard</span>
                            </div>
                        </div>
                        {/* Fake dashboard content */}
                        <div className="p-6 space-y-4 bg-gradient-to-br from-[hsl(340,30%,98%)] to-white min-h-[280px]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-44 bg-gradient-to-r from-[hsl(340,65%,65%,0.2)] to-[hsl(340,40%,90%)] rounded-lg" />
                                <div className="ml-auto h-8 w-28 bg-gradient-to-r from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] rounded-lg opacity-80" />
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {["Scout ✓", "Analyst ✓", "Strategist ⏸", "Executor"].map((label, i) => (
                                    <div key={label} className={`rounded-xl p-3 border ${i === 2 ? "border-[hsl(38,90%,65%,0.5)] bg-[hsl(38,90%,95%)]" : i < 2 ? "border-[hsl(130,55%,60%,0.4)] bg-[hsl(130,55%,96%)]" : "border-[hsl(340,20%,90%)] bg-white"}`}>
                                        <div className="text-[10px] font-semibold text-[hsl(340,20%,40%)]">{label}</div>
                                        <div className={`mt-1.5 h-1.5 rounded-full ${i < 2 ? "bg-[hsl(130,55%,60%)]" : i === 2 ? "bg-[hsl(38,90%,65%)]" : "bg-[hsl(340,20%,88%)]"}`} style={{ width: i === 0 ? "100%" : i === 1 ? "100%" : i === 2 ? "80%" : "0%" }} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-[hsl(340,20%,90%)] bg-white p-3 space-y-2">
                                    {[80, 55, 95, 40].map((w, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[hsl(340,65%,65%)] flex-shrink-0" />
                                            <div className="h-1.5 rounded-full bg-[hsl(340,30%,92%)]" style={{ width: `${w}%` }} />
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-xl border border-[hsl(38,90%,65%,0.4)] bg-[hsl(38,90%,98%)] p-3">
                                    <div className="text-[10px] font-bold text-[hsl(38,70%,45%)] mb-2">⏸ Awaiting Approval</div>
                                    <div className="h-2 w-3/4 bg-[hsl(38,90%,82%)] rounded mb-1.5" />
                                    <div className="h-2 w-1/2 bg-[hsl(38,90%,82%)] rounded mb-3" />
                                    <div className="h-6 w-full bg-gradient-to-r from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] rounded-md opacity-70" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* --- STATS --- */}
            <section className="py-16 border-y border-[hsl(340,25%,90%)] bg-white/50">
                <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            custom={i}
                            variants={fadeUp}
                            className="text-center"
                        >
                            <div className="text-4xl font-bold bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] bg-clip-text text-transparent mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {s.value}
                            </div>
                            <div className="text-sm text-[hsl(340,10%,50%)]">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* --- FEATURES --- */}
            <section className="py-24 max-w-7xl mx-auto px-6">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 bg-[hsl(340,40%,95%)] border border-[hsl(340,30%,88%)] text-[hsl(340,55%,50%)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
                        Platform Capabilities
                    </div>
                    <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Everything you need to dominate your market
                    </h2>
                    <p className="text-[hsl(340,10%,48%)] max-w-xl mx-auto">
                        A complete intelligence stack built for modern consumer goods brands.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            custom={i * 0.5}
                            variants={fadeUp}
                            className="group p-6 rounded-2xl border border-[hsl(340,25%,90%)] bg-white hover:border-[hsl(340,65%,78%)] hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(340,65%,65%,0.2)] to-[hsl(340,40%,92%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <f.icon className="w-5 h-5 text-[hsl(340,55%,52%)]" />
                            </div>
                            <h3 className="font-bold text-base mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
                            <p className="text-sm text-[hsl(340,10%,48%)] leading-relaxed">{f.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section id="how-it-works" className="py-24 bg-gradient-to-b from-[hsl(340,30%,96%)] to-white">
                <div className="max-w-5xl mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 bg-[hsl(340,40%,95%)] border border-[hsl(340,30%,88%)] text-[hsl(340,55%,50%)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
                            How It Works
                        </div>
                        <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Up and running in minutes
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true }}
                                custom={i * 0.5}
                                variants={fadeUp}
                                className="relative"
                            >
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-[calc(100%-12px)] w-full h-px border-t-2 border-dashed border-[hsl(340,30%,88%)] z-0" />
                                )}
                                <div className="relative z-10 p-5 rounded-2xl border border-[hsl(340,25%,90%)] bg-white">
                                    <div className="text-3xl font-black text-[hsl(340,65%,88%)] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.num}</div>
                                    <h3 className="font-bold text-sm mb-2">{step.title}</h3>
                                    <p className="text-xs text-[hsl(340,10%,50%)] leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CTA --- */}
            <section className="py-24 px-6">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="max-w-4xl mx-auto text-center rounded-3xl bg-gradient-to-br from-[hsl(340,65%,62%)] via-[hsl(340,70%,68%)] to-[hsl(270,55%,65%)] p-16 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute inset-0 opacity-10">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="absolute rounded-full border border-white" style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%" }} />
                        ))}
                    </div>
                    <div className="relative">
                        <CheckCircle2 className="w-12 h-12 text-white/80 mx-auto mb-6" />
                        <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Ready to outsmart your competition?
                        </h2>
                        <p className="text-white/75 mb-8 text-lg max-w-xl mx-auto">
                            Join brands already using MarketMind AI to stay ahead. No credit card required.
                        </p>
                        <Link
                            href={targetRoute}
                            suppressHydrationWarning
                            className="inline-flex items-center gap-2 bg-white text-[hsl(340,55%,50%)] font-bold px-8 py-4 rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-transform shadow-xl text-base"
                        >
                            {mounted && isAuthenticated ? "Go to Dashboard" : "Start for Free"} <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="border-t border-[hsl(340,25%,90%)] py-10 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(340,10%,52%)]">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-semibold text-[hsl(340,25%,25%)]">MarketMindAI</span>
                    </div>
                    <span>© {new Date().getFullYear()} MarketMind AI. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
