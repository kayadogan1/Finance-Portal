import { useQuery } from '@tanstack/react-query';
import { BrainCircuit, Sparkles, AlertTriangle, Minus } from 'lucide-react';
import { getAIInsight } from '../../services/marketService';
import type { Sentiment } from '../../types';

interface AIAnalysisCardProps {
    symbol: string;
}

/* ─── Sentiment badge ─── */
const sentimentConfig: Record<
    Sentiment,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
    BULLISH: {
        label: 'Bullish',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        icon: <Sparkles size={14} />,
    },
    BEARISH: {
        label: 'Bearish',
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-red-500/30',
        icon: <AlertTriangle size={14} />,
    },
    NEUTRAL: {
        label: 'Neutral',
        bg: 'bg-slate-500/15',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        icon: <Minus size={14} />,
    },
};

const SentimentBadge = ({ sentiment }: { sentiment: Sentiment }) => {
    const cfg = sentimentConfig[sentiment];
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

/* ─── Skeleton ─── */
const InsightSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-slate-700 rounded" />
            <div className="h-6 w-20 bg-slate-700 rounded-full" />
        </div>
        <div className="space-y-2.5 pt-2">
            <div className="h-4 bg-slate-700/50 rounded w-full" />
            <div className="h-4 bg-slate-700/40 rounded w-5/6" />
            <div className="h-4 bg-slate-700/30 rounded w-4/6" />
        </div>
        <div className="h-3 bg-slate-700/20 rounded w-3/4 mt-4" />
    </div>
);

/* ─── Card ─── */
const AIAnalysisCard = ({ symbol }: AIAnalysisCardProps) => {
    const {
        data: insight,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['ai-insight', symbol],
        queryFn: () => getAIInsight(symbol),
        staleTime: 1000 * 60 * 15, // 15 min cache
    });

    return (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/20 rounded-lg">
                        <BrainCircuit size={20} className="text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">AI Market Insight</h3>
                </div>
                {insight && <SentimentBadge sentiment={insight.sentiment} />}
            </div>

            {/* Body */}
            {isLoading && <InsightSkeleton />}

            {isError && (
                <div className="flex flex-col flex-1 items-center justify-center p-4 text-center">
                    <p className="text-slate-400 text-sm">
                        Yapay zeka analiz servisi şu anda kullanılamıyor.
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                        (Backend'de bu servis henüz aktif değil)
                    </p>
                </div>
            )}

            {insight && (
                <div className="flex flex-col flex-1">
                    {/* Summary */}
                    <p className="text-slate-300 leading-relaxed text-[15px]">
                        {insight.ai_summary}
                    </p>

                    {/* Disclaimer footer */}
                    <p className="mt-auto pt-5 text-xs text-slate-500 italic border-t border-slate-700/40">
                        {insight.disclaimer}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AIAnalysisCard;
