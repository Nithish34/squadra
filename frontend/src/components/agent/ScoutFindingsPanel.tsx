"use client";

import React, { useState } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, TrendingDown, TrendingUp, Tag, ExternalLink, MapPin, MessagesSquare, DollarSign } from 'lucide-react';

export default function ScoutFindingsPanel() {
    const scoutResult = useAgentStore((s) => s.scoutResult);
    const pipelineStatus = useAgentStore((s) => s.pipelineStatus);
    const [activeTab, setActiveTab] = useState<'competitors' | 'geo' | 'sentiment' | 'pricing'>('competitors');

    return (
        <div className="glass rounded-2xl border border-border/60 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-soft">
                        <Search className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="font-display font-semibold text-foreground text-sm leading-tight">Scout Intelligence</h2>
                        <p className="text-xs text-muted-foreground">
                            {scoutResult
                                ? `Analyzed ${scoutResult.competitors.length} competitors in ${scoutResult.geo_data?.location || 'target area'}`
                                : 'Real-time market intelligence'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-border/40 px-2 overflow-x-auto">
                {[
                    { id: 'competitors', label: 'Competitors', icon: Tag },
                    { id: 'geo', label: 'Geo Data', icon: MapPin },
                    { id: 'sentiment', label: 'Sentiment', icon: MessagesSquare },
                    { id: 'pricing', label: 'Pricing', icon: DollarSign },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'border-primary text-foreground' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4 flex-1">
                <AnimatePresence mode="wait">
                    {!scoutResult ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-10"
                        >
                            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
                            <p className="text-sm text-muted-foreground">
                                {pipelineStatus === 'SCOUT_RUNNING'
                                    ? 'Scout is scanning market data…'
                                    : 'Intelligence will appear here after the scan.'}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div key="findings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                            <ScrollArea className="h-[280px]">
                                {activeTab === 'competitors' && (
                                    <div className="space-y-3 pr-2">
                                        {scoutResult.competitors.map((comp, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className={`rounded-xl border p-4 bg-card/50 ${!comp.included ? 'opacity-40' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="text-xs font-bold text-foreground truncate">{comp.name}</span>
                                                    </div>
                                                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{comp.messaging}</p>
                                                {comp.promotions && comp.promotions.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {comp.promotions.map((promo, pi) => (
                                                            <span key={pi} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                                                                {promo}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'geo' && scoutResult.geo_data && (
                                    <div className="space-y-4 pr-2">
                                        <div className="p-4 rounded-xl border bg-card/50">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location Intelligence</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Area</span>
                                                    <span className="font-medium">{scoutResult.geo_data.location}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Traffic Level</span>
                                                    <span className="font-medium text-amber-600">{scoutResult.geo_data.traffic_level}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Accessibility</span>
                                                    <span className="font-medium text-emerald-600">{scoutResult.geo_data.distance_score}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'sentiment' && scoutResult.market_sentiment && (
                                    <div className="space-y-3 pr-2">
                                        {scoutResult.market_sentiment.positive_feedback.length > 0 && (
                                            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                                                <h4 className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" /> Positive Feedback
                                                </h4>
                                                <ul className="list-disc pl-4 text-xs text-emerald-600/90 space-y-0.5">
                                                    {scoutResult.market_sentiment.positive_feedback.map((item, i) => <li key={i}>{item}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {scoutResult.market_sentiment.customer_complaints.length > 0 && (
                                            <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                                                <h4 className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                                                    <TrendingDown className="w-3 h-3" /> Common Complaints
                                                </h4>
                                                <ul className="list-disc pl-4 text-xs text-red-600/90 space-y-0.5">
                                                    {scoutResult.market_sentiment.customer_complaints.map((item, i) => <li key={i}>{item}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'pricing' && scoutResult.pricing && (
                                    <div className="space-y-3 pr-2">
                                        <div className="p-4 rounded-xl border bg-card/50 text-center">
                                            <span className="block text-xs font-semibold text-muted-foreground mb-1">Market Average Price</span>
                                            <span className="text-3xl font-display font-bold text-foreground">
                                                ₹{scoutResult.pricing.average_price.toFixed(0)}
                                            </span>
                                            <span className="block text-[10px] text-muted-foreground mt-1">Range: {scoutResult.pricing.price_range}</span>
                                        </div>
                                        {Object.entries(scoutResult.pricing.competitor_prices || {}).map(([name, price]) => (
                                            <div key={name} className="flex justify-between items-center p-2 text-sm border-b border-border/40 last:border-0">
                                                <span className="text-foreground font-medium">{name}</span>
                                                <span className="text-muted-foreground font-mono">₹{price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
