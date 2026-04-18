const KNOWN_US_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'SPX', 'META', 'NFLX', 'DJI', 'IXIC', 'EURUSD', 'GBPUSD'];

export const formatMarketPrice = (price: number, symbol: string, region?: 'TR' | 'US'): string => {
    const isUS = KNOWN_US_SYMBOLS.includes(symbol.toUpperCase());
    
    if (region === 'US' || isUS || symbol.includes('USDT')) {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    }
    return `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};
