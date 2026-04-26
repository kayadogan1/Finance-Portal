/* ─── Currency formatting based on API-sourced baseCurrency ─── */

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    USDT: '$',
    TRY: '₺',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF ',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    CNY: '¥',
    INR: '₹',
    RUB: '₽',
    SAR: 'SAR ',
    SEK: 'SEK ',
    NOK: 'NOK ',
    DKK: 'DKK ',
    ZAR: 'R',
    XAU: '$',
    XAG: '$',
    BTC: '₿',
    ETH: 'Ξ',
};

const TRY_CURRENCIES = new Set(['TRY']);

/**
 * Format a market price using the actual baseCurrency from the API.
 * No more heuristic guessing — the backend tells us the currency.
 */
export const formatMarketPrice = (price: number, baseCurrency?: string): string => {
    const cur = (baseCurrency ?? 'USD').toUpperCase();
    const symbol = CURRENCY_SYMBOLS[cur] ?? `${cur} `;
    const isTR = TRY_CURRENCIES.has(cur);

    const formatted = price.toLocaleString(isTR ? 'tr-TR' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: price < 1 ? 6 : price < 100 ? 4 : 2,
    });

    return `${symbol}${formatted}`;
};

/**
 * Determine if an instrument belongs to TR region based on its baseCurrency.
 */
export const isTRCurrency = (baseCurrency?: string): boolean => {
    return (baseCurrency ?? '').toUpperCase() === 'TRY';
};

/**
 * Determine if an instrument belongs to US/global region based on its baseCurrency.
 */
export const isUSCurrency = (baseCurrency?: string): boolean => {
    const cur = (baseCurrency ?? 'USD').toUpperCase();
    return ['USD', 'USDT', 'XAU', 'XAG'].includes(cur);
};
