export type InstrumentType = 'CRYPTO' | 'FOREX' | 'STOCK' | 'COMMODITY' | 'INDEX' | 'BOND' | 'FIAT';

export interface Instrument {
    id: string;
    symbol: string;
    name: string;
    type: InstrumentType;
    currentPrice: number;
    lastUpdateTime: string;
    isActive: boolean;
}

export interface PortfolioItem {
    id: string;
    instrument: Instrument;
    quantity: number;
    averageCost: number;
}
export interface Portfolio {
    id: string;
    userId: string;
    name: string;
    items: PortfolioItem[];
    cashBalance: number;
}

export interface DepositRequest {
    userId: string;
    amount: number;
}

export interface BuyOrSellRequest {
    userId: string;
    instrumentSymbol: string;
    quantity: number;
}

export type TabType = 'portfolio' | 'market';
export type MarketTabType = 'ALL' | 'FOREX' | 'CRYPTO' | 'STOCK';
