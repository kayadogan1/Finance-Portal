import api from './api';
import type { OHLCData, AIInsight, Sentiment } from '../types';

/* ─────────────────────────────── Backend DTO shapes ─────────────────────────────── */

/** Matches `com.finance.shared.CandleDto` */
interface CandleDto {
    time: string; // ISO LocalDateTime e.g. "2026-01-20T00:00:00"
    open: number;
    high: number;
    low: number;
    close: number;
}

/* ─────────────────────────────── Market History ─────────────────────────────── */

/**
 * Fetch OHLC candlestick data from the backend.
 * Route: GET /api/market/candles/{symbol}?slot=D1
 *
 * The backend returns CandleDto[] with `time` as an ISO LocalDateTime string.
 * We normalise it to `YYYY-MM-DD` for lightweight-charts compatibility.
 */
export const getMarketHistory = async (symbol: string): Promise<OHLCData[]> => {
    const { data } = await api.get<CandleDto[]>(`/api/market/candles/${symbol}`, {
        params: { slot: 'D1' },
    });

    return data.map((candle) => ({
        time: candle.time.slice(0, 10), // "2026-01-20T00:00:00" → "2026-01-20"
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
    }));
};

/* ─────────────────────────────── AI Insight (mock) ─────────────────────────────── */

/**
 * ⚠️ The AI Insight endpoint does NOT exist in the backend yet.
 * This function provides a temporary mock so the UI doesn't break with a 404.
 * Replace with a real API call once the backend implements the endpoint.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const insightMap: Record<string, { summary: string; sentiment: Sentiment }> = {
    BTCUSDT: {
        summary:
            'Strong uptrend detected. The MACD shows a golden cross and RSI is at 72, indicating strong buying pressure but approaching overbought territory.',
        sentiment: 'BULLISH',
    },
    ETHUSDT: {
        summary:
            'Consolidation phase with bullish divergence on the RSI. Volume is declining, suggesting a breakout is imminent. Support at $3,200 holds firm.',
        sentiment: 'BULLISH',
    },
    THYAO: {
        summary:
            'Bearish head-and-shoulders pattern forming on the daily chart. RSI dropped below 40 and MACD is trending negative. Watch for a break below ₺82 support.',
        sentiment: 'BEARISH',
    },
    ASELS: {
        summary:
            'Sideways movement with neutral momentum. Bollinger Bands are contracting, indicating low volatility. A directional move is expected within the next 5 sessions.',
        sentiment: 'NEUTRAL',
    },
};

export const getAIInsight = async (symbol: string): Promise<AIInsight> => {
    // TODO: Replace with api.get<AIInsight>(`/api/market/ai-insight/${symbol}`) when backend is ready
    await delay(1500);

    const entry = insightMap[symbol] ?? {
        summary: `Technical analysis is unavailable for ${symbol} at this time.`,
        sentiment: 'NEUTRAL' as Sentiment,
    };

    return {
        symbol,
        ai_summary: entry.summary,
        sentiment: entry.sentiment,
        disclaimer:
            'This analysis is AI-generated based on technical indicators and is not financial advice.',
    };
};
