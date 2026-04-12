import { privateApi } from './api';

/* ─────────────────────────────── Backend DTO shapes ─────────────────────────────── */

export const RiskTolerance = {
    UNDEFINED: "UNDEFINED",
    CONSERVATIVE: "CONSERVATIVE",
    MODERATE: "MODERATE",
    AGGRESSIVE: "AGGRESSIVE"
} as const;
export type RiskTolerance = typeof RiskTolerance[keyof typeof RiskTolerance];

export const PortfolioPurposeType = {
    LONG_TERM_SAVINGS: "LONG_TERM_SAVINGS",
    RETIREMENT: "RETIREMENT",
    SHORT_TERM_TRADING: "SHORT_TERM_TRADING",
    INCOME_GENERATION: "INCOME_GENERATION",
    CAPITAL_PRESERVATION: "CAPITAL_PRESERVATION",
    SPECULATION: "SPECULATION",
    EDUCATION_FUND: "EDUCATION_FUND",
    HOUSE_FUND: "HOUSE_FUND",
    EMERGENCY_FUND: "EMERGENCY_FUND",
    GENERAL: "GENERAL"
} as const;
export type PortfolioPurposeType = typeof PortfolioPurposeType[keyof typeof PortfolioPurposeType];

/**
 * Matches backend `PortfolioReadDto`.
 * GET /api/portfolio returns List<PortfolioReadDto>
 */
export interface PortfolioDto {
    id: string;
    portfolioName: string;
    riskTolerance: RiskTolerance;
    purpose: PortfolioPurposeType;
    portfolioItems?: PortfolioItemDto[];
    portfolioBalance: number;
}

/** Used for creating a new portfolio — no id or cashBalance needed */
export interface CreatePortfolioRequest {
    portfolioName: string;
    riskTolerance: RiskTolerance;
    purpose: PortfolioPurposeType;
    portfolioItems?: { instrumentSymbol: string; quantity: number }[];
}

export interface PortfolioItemDto {
    instrumentDto?: {
        symbol: string;
        name: string;
        instrumentType: string;
        currentPrice: number;
    };
    instrumentSymbol?: string;
    amount: number;
    averageCost: number;
}

/** Matches `com.finance.shared.PerformanceLineChartDto` */
export interface PerformanceLineChartDto {
    time: string; // Java LocalDate — "2026-02-03" format
    totalPrice: number;
}

/** Matches `com.finance.shared.PieChartDto` */
export interface PieChartDto {
    instrumentName: string;
    totalValue: number;
}

/** Matches `com.finance.shared.PortfolioRange` enum */
export type PortfolioRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEARLY' | 'ALL';

/* ─────────────────────────────── API calls ─────────────────────────────── */

/**
 * Fetch portfolios for the authenticated user.
 * Route: GET /api/portfolio/myPortfolios
 */
export const getPortfolios = async (): Promise<PortfolioDto[]> => {
    const { data } = await privateApi.get<PortfolioDto[]>('/api/portfolio/myPortfolios');
    return Array.isArray(data) ? data : [];
};

/**
 * Fetch a single portfolio by ID.
 * Route: GET /api/portfolio/{portfolioId}
 */
export const getPortfolioById = async (portfolioId: string): Promise<PortfolioDto> => {
    const { data } = await privateApi.get<PortfolioDto>(`/api/portfolio/${portfolioId}`);
    return data;
};

/**
 * Create a new portfolio.
 * Route: POST /api/portfolio/create
 */
export const createPortfolio = async (portfolio: CreatePortfolioRequest): Promise<void> => {
    await privateApi.post('/api/portfolio/create', portfolio);
};

/**
 * Fetch pie chart data for a portfolio.
 * Route: GET /api/portfolio/value/{portfolioId}
 * Returns: PieChartDto[] = [{ instrumentName, totalValue }]
 */
export const getPortfolioPieChart = async (portfolioId: string): Promise<PieChartDto[]> => {
    const { data } = await privateApi.get<PieChartDto[]>(`/api/portfolio/value/${portfolioId}`);
    return data ?? [];
};

/**
 * Fetch portfolio history by ID.
 * Route: GET /api/portfolio/{portfolioId}/history?portfolioRange=WEEKLY
 *
 * Backend returns PerformanceLineChartDto[] with Java LocalDate in `time`.
 */
export const getPortfolioHistory = async (
    portfolioId: string,
    portfolioRange: PortfolioRange = 'WEEKLY',
): Promise<PerformanceLineChartDto[]> => {
    const { data } = await privateApi.get<PerformanceLineChartDto[]>(
        `/api/portfolio/${portfolioId}/history`,
        { params: { portfolioRange } },
    );
    return data ?? [];
};

/**
 * Deposit funds into portfolio.
 * Route: POST /api/portfolio/deposit
 */
export const depositFunds = async (amount: number, portfolioId: string): Promise<void> => {
    await privateApi.post('/api/portfolio/deposit', { amount, portfolioId });
};

/**
 * Buy an instrument for the portfolio.
 * Route: POST /api/portfolio/buy
 */
export const buyInstrument = async (
    instrumentSymbol: string,
    quantity: number,
    portfolioId: string,
): Promise<void> => {
    await privateApi.post('/api/portfolio/buy', { instrumentSymbol, quantity, portfolioId });
};

/**
 * Sell an instrument from the portfolio.
 * Route: POST /api/portfolio/sell
 */
export const sellInstrument = async (
    instrumentSymbol: string,
    quantity: number,
    portfolioId: string,
): Promise<void> => {
    await privateApi.post('/api/portfolio/sell', { instrumentSymbol, quantity, portfolioId });
};

/* ─────────────────────────────── Transaction History ─────────────────────────────── */

/** Matches `com.finance.shared.TransactionDto` */
export interface TransactionDto {
    transactionType: 'BUY' | 'SELL';
    instrumentName: string;
    quantity: number;
    price: number;
    dateTime: string; // Java LocalDateTime ISO
}

/**
 * Fetch transaction history for the authenticated user.
 * Route: GET /api/portfolio/transactions?startDate={YYYY-MM-DD}
 */
export const getTransactions = async (startDate?: string): Promise<TransactionDto[]> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;

    const { data } = await privateApi.get<TransactionDto[]>('/api/portfolio/transactions', { params });
    return Array.isArray(data) ? data : [];
};

