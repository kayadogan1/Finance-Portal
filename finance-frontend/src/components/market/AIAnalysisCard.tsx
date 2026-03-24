import { useQuery } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, Minus, BarChart2 } from 'lucide-react';
import { getAIInsight } from '../../services/marketService';
import type { Sentiment } from '../../types';

interface AIAnalysisCardProps { symbol: string; }

const sentimentConfig: Record<Sentiment, { label: string; cls: string; icon: React.ReactNode }> = {
    BULLISH:  { label: 'Bullish',  cls: 'badge-positive', icon: <Sparkles size={11} /> },
    BEARISH:  { label: 'Bearish',  cls: 'badge-negative', icon: <AlertTriangle size={11} /> },
    NEUTRAL:  { label: 'Neutral',  cls: 'bg-white/5 text-muted-foreground text-[12px] font-medium tabular-nums px-2 py-0.5 rounded-sm', icon: <Minus size={11} /> },
};

const InsightSkeleton = () => (
    <div className="animate-pulse space-y-3">
        <div className="h-5 w-40 rounded bg-white/[0.05]" />
        <div className="space-y-2 pt-1">
            <div className="h-3.5 rounded w-full bg-white/[0.04]" />
            <div className="h-3.5 rounded w-5/6 bg-white/[0.03]" />
            <div className="h-3.5 rounded w-4/6 bg-white/[0.02]" />
        </div>
    </div>
);

const AIAnalysisCard = ({ symbol }: AIAnalysisCardProps) => {
    const { data: insight, isLoading, isError } = useQuery({
        queryKey: ['ai-insight', symbol], queryFn: () => getAIInsight(symbol), staleTime: 1000 * 60 * 15,
    });

    return (
        <div className="card-base flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-[14px] font-medium text-foreground">AI Market Insight</span>
                </div>
                {insight && (
                    <span className={`inline-flex items-center gap-1 ${sentimentConfig[insight.sentiment].cls}`}>
                        {sentimentConfig[insight.sentiment].icon}
                        {sentimentConfig[insight.sentiment].label}
                    </span>
                )}
            </div>

            {isLoading && <InsightSkeleton />}

            {isError && (
                <div className="flex flex-col flex-1 items-center justify-center py-8 text-center">
                    <BarChart2 size={24} className="mb-2 text-ghost" />
                    <p className="text-[13px] text-muted-foreground">AI analiz servisi kullanılamıyor.</p>
                    <p className="text-meta mt-1">(Backend'de bu servis henüz aktif değil)</p>
                </div>
            )}

            {insight && (
                <div className="flex flex-col flex-1">
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{insight.ai_summary}</p>
                    <p className="mt-auto pt-4 text-[11px] italic text-subtle border-t border-border/50">{insight.disclaimer}</p>
                </div>
            )}
        </div>
    );
};

export default AIAnalysisCard;
