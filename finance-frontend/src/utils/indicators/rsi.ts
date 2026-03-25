import type { OHLCData } from '../../types';
import type { IndicatorPoint } from './sma';

/**
 * Relative Strength Index (RSI)
 *
 * Uses Wilder smoothing (exponential moving average of gains/losses).
 * Returns values between 0 and 100.
 *   > 70 → Overbought (aşırı alım)
 *   < 30 → Oversold  (aşırı satım)
 */
export function calculateRSI(candles: OHLCData[], period = 14): IndicatorPoint[] {
    if (candles.length < period + 1) return [];

    const result: IndicatorPoint[] = [];

    // Calculate price changes
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Initial average gain/loss (simple average of first `period` values)
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    // First RSI value
    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const firstRSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + firstRS));
    result.push({ time: candles[period].time, value: firstRSI });

    // Subsequent values using Wilder smoothing
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

        if (avgLoss === 0) {
            result.push({ time: candles[i + 1].time, value: 100 });
        } else {
            const rs = avgGain / avgLoss;
            result.push({ time: candles[i + 1].time, value: 100 - (100 / (1 + rs)) });
        }
    }

    return result;
}
