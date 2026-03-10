"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { apiLogin, apiSignup } from "@/lib/api";

type Tab = "login" | "signup";

function AuthContent() {
    const router = useRouter();
    const setAuth = useAuthStore((s) => s.setAuth);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

    useEffect(() => {
        if (isAuthenticated) {
            router.replace(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
        }
    }, [isAuthenticated, hasCompletedOnboarding, router]);

    const searchParams = useSearchParams();
    const initialTab = (searchParams.get("tab") as Tab) === "signup" ? "signup" : "login";

    const [tab, setTab] = useState<Tab>(initialTab);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (tab === "signup" && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            let tokenData;
            if (tab === "signup") {
                tokenData = await apiSignup(email, password, name.trim() || email.split("@")[0]);
            } else {
                tokenData = await apiLogin(email, password);
            }
            const displayName = name.trim() || email.split("@")[0];
            setAuth(tokenData.access_token, email, displayName);
            router.push(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Authentication failed.";
            // Surface friendly messages
            if (msg.includes("401") || msg.includes("Unauthorized")) {
                setError("Invalid email or password. Please try again.");
            } else if (msg.includes("409") || msg.includes("already")) {
                setError("An account with this email already exists. Sign in instead.");
            } else if (msg.includes("422")) {
                setError("Please check your inputs and try again.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const switchTab = (t: Tab) => {
        setTab(t);
        setError("");
    };

    return (
        <div className="min-h-screen bg-[hsl(340,30%,98%)] flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[hsl(340,65%,62%)] via-[hsl(340,70%,68%)] to-[hsl(270,55%,65%)] flex-col justify-between p-12 overflow-hidden">
                {[280, 420, 570].map((s, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full border border-white/15"
                        style={{ width: s, height: s, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                    />
                ))}
                <Link href="/" className="relative flex items-center gap-2 text-white/90 text-sm hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                </Link>
                <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            MarketMind<span className="text-white/70">AI</span>
                        </span>
                    </div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Autonomous market intelligence.<br />For ambitious brands.
                    </h2>
                    <p className="text-white/70 leading-relaxed">
                        Deploy AI agents that never sleep. Track competitors, model pricing, and surface opportunities — all without lifting a finger.
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        {["Real-time competitor monitoring", "AI pricing strategy", "Human-in-the-loop controls", "Auto-publish to Shopify & Instagram"].map((f) => (
                            <div key={f} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0" />
                                <span className="text-white/85 text-xs">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(340,65%,65%)] to-[hsl(340,70%,72%)] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        MarketMind<span className="text-[hsl(340,65%,65%)]">AI</span>
                    </span>
                </Link>

                <div className="w-full max-w-md">
                    <div className="flex bg-[hsl(340,25%,93%)] rounded-xl p-1 mb-8">
                        {(["login", "signup"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => switchTab(t)}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tab === t
                                    ? "bg-white text-[hsl(340,25%,15%)] shadow-sm"
                                    : "text-[hsl(340,10%,50%)] hover:text-[hsl(340,25%,30%)]"
                                    }`}
                            >
                                {t === "login" ? "Sign In" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: tab === "login" ? 20 : -20 }}
                            transition={{ duration: 0.22 }}
                        >
                            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {tab === "login" ? "Welcome back" : "Create your account"}
                            </h1>
                            <p className="text-[hsl(340,10%,50%)] text-sm mb-7">
                                {tab === "login"
                                    ? "Sign in to access your market intelligence war room."
                                    : "Start monitoring your market in minutes — it's free."}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {tab === "signup" && (
                                    <div>
                                        <label className="block text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">Full Name</label>
                                        <input
                                            id="signup-name"
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">Email</label>
                                    <input
                                        id="auth-email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">Password</label>
                                    <div className="relative">
                                        <input
                                            id="auth-password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            className="w-full px-4 py-3 pr-11 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(340,10%,55%)] hover:text-[hsl(340,25%,30%)] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {tab === "signup" && (
                                    <div>
                                        <label className="block text-sm font-medium text-[hsl(340,20%,30%)] mb-1.5">Confirm Password</label>
                                        <input
                                            id="auth-confirm-password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat password"
                                            className="w-full px-4 py-3 rounded-xl border border-[hsl(340,25%,88%)] bg-white text-sm placeholder-[hsl(340,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(340,65%,68%)] focus:border-transparent transition"
                                        />
                                    </div>
                                )}

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg"
                                        >
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {tab === "login" && (
                                    <div className="flex justify-end">
                                        <button type="button" className="text-xs text-[hsl(340,55%,52%)] hover:underline">
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                <button
                                    id="auth-submit"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[hsl(340,65%,62%)] to-[hsl(340,70%,68%)] text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> {tab === "login" ? "Signing in..." : "Creating account..."}</>
                                    ) : (
                                        tab === "login" ? "Sign In" : "Create Account"
                                    )}
                                </button>

                                <p className="text-center text-xs text-[hsl(340,10%,52%)] mt-2">
                                    {tab === "login" ? (
                                        <>Don't have an account?{" "}
                                            <button type="button" onClick={() => switchTab("signup")} className="text-[hsl(340,55%,52%)] font-semibold hover:underline">
                                                Sign up free
                                            </button>
                                        </>
                                    ) : (
                                        <>Already have an account?{" "}
                                            <button type="button" onClick={() => switchTab("login")} className="text-[hsl(340,55%,52%)] font-semibold hover:underline">
                                                Sign in
                                            </button>
                                        </>
                                    )}
                                </p>
                            </form>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[hsl(340,30%,98%)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(340,65%,65%)]" />
            </div>
        }>
            <AuthContent />
        </Suspense>
    );
}
