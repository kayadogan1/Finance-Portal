import type { OHLCData } from '../../types';
import type { IndicatorPoint } from './sma';

/**
 * Exponential Moving Average (EMA)
 * Gives more weight to recent prices using a smoothing multiplier.
 *
 * EMA[0] = SMA(period)
 * EMA[i] = (Close[i] - EMA[i-1]) × multiplier + EMA[i-1]
 */
export function calculateEMA(candles: OHLCData[], period: number): IndicatorPoint[] {
    if (candles.length < period) return [];

    const multiplier = 2 / (period + 1);
    const result: IndicatorPoint[] = [];

    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += candles[i].close;
    }
    let ema = sum / period;
    result.push({ time: candles[period - 1].time, value: ema });

    for (let i = period; i < candles.length; i++) {
        ema = (candles[i].close - ema) * multiplier + ema;
        result.push({ time: candles[i].time, value: ema });
    }

    return result;
}

/**
 * EMA calculated from raw IndicatorPoint values (used by MACD).
 */
export function calculateEMAFromValues(data: IndicatorPoint[], period: number): IndicatorPoint[] {
    if (data.length < period) return [];

    const multiplier = 2 / (period + 1);
    const result: IndicatorPoint[] = [];

    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].value;
    }
    let ema = sum / period;
    result.push({ time: data[period - 1].time, value: ema });

    for (let i = period; i < data.length; i++) {
        ema = (data[i].value - ema) * multiplier + ema;
        result.push({ time: data[i].time, value: ema });
    }

    return result;
}
