"use client";

import React from 'react';
import { useAgentStore } from '@/store/agentStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, TrendingDown, TrendingUp, Tag, ExternalLink, Shield } from 'lucide-react';

const findingTypeColors: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    price_change: { label: 'Price Change', color: 'text-amber-600 bg-amber-50 border-amber-200', Icon: TrendingDown },
    new_product: { label: 'New Product', color: 'text-blue-600 bg-blue-50 border-blue-200', Icon: Tag },
    promotion: { label: 'Promotion', color: 'text-violet-600 bg-violet-50 border-violet-200', Icon: TrendingUp },
};

export default function ScoutFindingsPanel() {
    const scoutResult = useAgentStore((s) => s.scoutResult);
    const pipelineStatus = useAgentStore((s) => s.pipelineStatus);

    return (
        <div className="glass rounded-2xl border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-soft">
                        <Search className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="font-display font-semibold text-foreground text-sm leading-tight">Scout Findings</h2>
                        <p className="text-xs text-muted-foreground">
                            {scoutResult
                                ? `${scoutResult.findings.filter(f => f.included).length} findings collected`
                                : 'Real-time competitor intelligence'}
                        </p>
                    </div>
                </div>
                {scoutResult && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {scoutResult.findings.length} total
                    </span>
                )}
            </div>

            <div className="p-4">
                <AnimatePresence mode="wait">
                    {!scoutResult ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-10"
                        >
                            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {pipelineStatus === 'SCOUT_RUNNING'
                                    ? 'Scout is scanning competitor sites…'
                                    : 'Scout findings will appear here after the scan completes.'}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div key="findings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <ScrollArea className="h-[360px]">
                                <div className="space-y-3 pr-2">
                                    {scoutResult.findings.map((finding, i) => {
                                        const typeInfo = findingTypeColors[finding.finding_type] ?? findingTypeColors.promotion;
                                        const TypeIcon = typeInfo.Icon;
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className={`rounded-xl border p-4 transition-all ${!finding.included ? 'opacity-40' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1 ${typeInfo.color}`}>
                                                            <TypeIcon className="w-3 h-3" /> {typeInfo.label}
                                                        </span>
                                                        <span className="text-xs font-semibold text-foreground truncate">{finding.competitor_name}</span>
                                                    </div>
                                                    <a
                                                        href={finding.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-primary flex-shrink-0 transition-colors"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                                <p className="text-sm font-medium text-foreground mb-1">{finding.title}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{finding.detail}</p>
                                                {(finding.price_before !== null || finding.price_after !== null) && (
                                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
                                                        {finding.price_before !== null && (
                                                            <span className="text-xs text-muted-foreground line-through">₹{finding.price_before}</span>
                                                        )}
                                                        {finding.price_after !== null && (
                                                            <span className="text-xs font-bold text-foreground">→ ₹{finding.price_after}</span>
                                                        )}
                                                        {finding.price_before !== null && finding.price_after !== null && (
                                                            <span className={`text-xs font-semibold ${finding.price_after < finding.price_before ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                ({finding.price_after < finding.price_before ? '↓' : '↑'}
                                                                {Math.abs(((finding.price_after - finding.price_before) / finding.price_before) * 100).toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
