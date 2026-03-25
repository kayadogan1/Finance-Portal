import type { OHLCData } from '../../types';

export interface IndicatorPoint {
    time: number;
    value: number;
}

/**
 * Simple Moving Average (SMA)
 * Calculates the arithmetic mean of the last `period` closing prices.
 */
export function calculateSMA(candles: OHLCData[], period: number): IndicatorPoint[] {
    if (candles.length < period) return [];

    const result: IndicatorPoint[] = [];
    let windowSum = 0;

    // Initial window
    for (let i = 0; i < period; i++) {
        windowSum += candles[i].close;
    }
    result.push({ time: candles[period - 1].time, value: windowSum / period });

    // Sliding window
    for (let i = period; i < candles.length; i++) {
        windowSum += candles[i].close - candles[i - period].close;
        result.push({ time: candles[i].time, value: windowSum / period });
    }

    return result;
}
