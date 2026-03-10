"use client";

import { useAgentStore } from '@/store/agentStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Instagram, Tag, TrendingDown, Sparkles, Hash, ImageIcon, CheckCircle2 } from 'lucide-react';

const riskColors: Record<string, string> = {
    low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    high: 'text-red-600 bg-red-50 border-red-200',
};

export default function StrategyOutputPanel() {
    const strategistResult = useAgentStore((s) => s.strategistResult);
    const analystResult = useAgentStore((s) => s.analystResult);
    const pipelineStatus = useAgentStore((s) => s.pipelineStatus);
    const publishLog = useAgentStore((s) => s.publishLog);

    const hasStrategyData = !!strategistResult;

    return (
        <div className="space-y-4">
            {/* Strategist Output Card */}
            <div className="glass rounded-2xl border border-border/60 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/30">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="font-display font-semibold text-foreground text-sm leading-tight">Strategy Output</h2>
                        <p className="text-xs text-muted-foreground">Strategist Agent recommendation</p>
                    </div>
                    {hasStrategyData && (
                        <span className="ml-auto text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                    )}
                </div>

                <div className="p-5">
                    <AnimatePresence mode="wait">
                        {!hasStrategyData ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-10"
                            >
                                <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {pipelineStatus === 'STRATEGIST_RUNNING'
                                        ? 'Strategist is drafting your recommendation…'
                                        : 'Strategy recommendation will appear here after agents complete.'}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="strategy"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {/* Type badge */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-violet-50 border-violet-200 text-violet-700 capitalize">
                                        {strategistResult.recommendation_type.replace('_', ' ')}
                                    </span>
                                    {strategistResult.gen_ui_card.price_adjustment && (
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3" /> Price Adjustment
                                        </span>
                                    )}
                                </div>

                                {/* Instagram card preview */}
                                <div className="rounded-xl border border-border bg-gradient-to-br from-violet-50/50 to-pink-50/50 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
                                        <Instagram className="w-4 h-4 text-pink-500" />
                                        <span className="text-xs font-semibold text-foreground">Instagram Post Preview</span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <h3 className="font-display font-bold text-foreground text-base leading-snug">
                                            {strategistResult.gen_ui_card.headline}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {strategistResult.gen_ui_card.body_copy}
                                        </p>
                                        {/* CTA */}
                                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold gradient-primary text-white px-3 py-1.5 rounded-lg">
                                            <Sparkles className="w-3 h-3" />
                                            {strategistResult.gen_ui_card.cta}
                                        </div>
                                        {/* Hashtags */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {strategistResult.gen_ui_card.hashtags.map((tag) => (
                                                <span key={tag} className="text-xs text-primary font-medium flex items-center gap-0.5">
                                                    <Hash className="w-3 h-3" />{tag}
                                                </span>
                                            ))}
                                        </div>
                                        {/* Image prompt */}
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-background/80 border border-border/50">
                                            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-muted-foreground italic">
                                                {strategistResult.gen_ui_card.suggested_image_prompt}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Price adjustment */}
                                {strategistResult.gen_ui_card.price_adjustment && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(strategistResult.gen_ui_card.price_adjustment).map(([key, val]) => (
                                            <div key={key} className="rounded-lg bg-muted p-3">
                                                <p className="text-xs text-muted-foreground capitalize mb-0.5">{key.replace(/_/g, ' ')}</p>
                                                <p className="text-sm font-bold text-foreground">{String(val)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Rationale */}
                                <div className="p-3 rounded-xl bg-accent/50 border border-border/50">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Strategist Rationale</p>
                                    <p className="text-sm text-foreground leading-relaxed">{strategistResult.rationale}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Analyst Gaps (if available) */}
            {analystResult && analystResult.gaps.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl border border-border/60 overflow-hidden"
                >
                    <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                        <h2 className="font-display font-semibold text-foreground text-sm">Analyst Gap Analysis</h2>
                        <p className="text-xs text-muted-foreground">
                            Confidence: {(analystResult.confidence_score * 100).toFixed(0)}%
                            {analystResult.recommended_price_delta_pct !== null && (
                                <> · Recommended price change: {analystResult.recommended_price_delta_pct > 0 ? '+' : ''}{analystResult.recommended_price_delta_pct}%</>
                            )}
                        </p>
                    </div>
                    <div className="p-5 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{analystResult.summary}</p>
                        <div className="space-y-2">
                            {analystResult.gaps.map((gap, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${riskColors[gap.risk_level] ?? riskColors.medium}`}>
                                        {gap.risk_level}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground">{gap.category}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{gap.opportunity}</p>
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span className="text-muted-foreground">Them: <strong className="text-foreground">{gap.competitor_value}</strong></span>
                                            <span className="text-muted-foreground">You: <strong className="text-foreground">{gap.your_value}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Publish log */}
            {publishLog.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5"
                >
                    <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Published
                    </p>
                    {publishLog.map((entry, i) => (
                        <p key={i} className="text-xs text-emerald-600">{entry}</p>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
