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

/** Matches `com.finance.shared.PortfolioDto` */
export interface PortfolioDto {
    id?: string;
    portfolioName: string;
    riskTolerance: RiskTolerance;
    purpose: PortfolioPurposeType;
    portfolioItems?: PortfolioItemDto[];
}

export interface PortfolioItemDto {
    instrumentSymbol: string;
    quantity: number;
    averageCost: number;
}

/** Matches `com.finance.shared.PerformanceLineChartDto` */
export interface PerformanceLineChartDto {
    time: string; // ISO LocalDate "2026-02-15"
    totalPrice: number;
}

/** Matches `com.finance.shared.PieChartDto` */
export interface PieChartDto {
    instrumentName: string;
    totalValue: number;
}

/* ─────────────────── Derived shapes used by existing UI ─────────────────── */

export interface DistributionData {
    labels: string[];
    series: number[];
}

export interface HistoryData {
    timeline: string[];
    totalValues: number[];
}

/* ─────────────────────────────── API calls ─────────────────────────────── */

/**
 * Fetch all portfolios for the authenticated user.
 * Route: GET /api/portfolio
 */
export const getPortfolios = async (): Promise<PortfolioDto[]> => {
    const { data } = await privateApi.get<PortfolioDto[]>('/api/portfolio');
    return data;
};

/**
 * Derive distribution data from the first portfolio's items.
 * Route: GET /api/portfolio  (we reuse the portfolio list)
 *
 * The backend does not have a dedicated /distribution endpoint,
 * so we compute it client-side from the portfolio items.
 */
export const getDistribution = async (): Promise<DistributionData> => {
    const portfolios = await getPortfolios();

    if (portfolios.length === 0) {
        return { labels: [], series: [] };
    }

    const items = portfolios[0].portfolioItems ?? [];
    return {
        labels: items.map((i) => i.instrumentSymbol),
        series: items.map((i) => i.quantity * i.averageCost),
    };
};

/**
 * Fetch portfolio value history.
 * Route: GET /api/portfolio/{portfolioId}/history?days=30
 *
 * Since we don't have the portfolioId on the frontend yet,
 * we first fetch the portfolio list and use the first one.
 */
export const getHistory = async (): Promise<HistoryData> => {
    const portfolios = await getPortfolios();

    if (portfolios.length === 0) {
        return { timeline: [], totalValues: [] };
    }

    // The backend portfolio list doesn't include IDs in PortfolioDto.
    // Until the backend DTO is extended, we fetch history from the
    // generic portfolio endpoint. For now, use the first portfolio.
    // TODO: Backend should expose portfolio ID in PortfolioDto.
    const { data } = await privateApi.get<PerformanceLineChartDto[]>(
        '/api/portfolio/history',
        { params: { days: 30 } },
    );

    return {
        timeline: data.map((d) => d.time),
        totalValues: data.map((d) => Number(d.totalPrice)),
    };
};

/**
 * Create a new portfolio.
 * Route: POST /api/portfolio/create
 */
export const createPortfolio = async (portfolio: PortfolioDto): Promise<void> => {
    await privateApi.post('/api/portfolio/create', portfolio);
};

/**
 * Fetch pie chart data for a portfolio.
 * Route: GET /api/portfolio/value/{portfolioId}
 * Returns: PieChartDto[] = [{ instrumentName, totalValue }]
 */
export const getPortfolioPieChart = async (portfolioId: string): Promise<PieChartDto[]> => {
    const { data } = await privateApi.get<PieChartDto[]>(`/api/portfolio/value/${portfolioId}`);
    return data;
};

/**
 * Fetch portfolio history by ID.
 * Route: GET /api/portfolio/{portfolioId}/history
 */
export const getPortfolioHistory = async (portfolioId: string, days: number = 30): Promise<PerformanceLineChartDto[]> => {
    const { data } = await privateApi.get<PerformanceLineChartDto[]>(`/api/portfolio/${portfolioId}/history`, {
        params: { days }
    });
    return data;
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
export const buyInstrument = async (instrumentSymbol: string, quantity: number, portfolioId: string): Promise<void> => {
    await privateApi.post('/api/portfolio/buy', { instrumentSymbol, quantity, portfolioId });
};

/**
 * Sell an instrument from the portfolio.
 * Route: POST /api/portfolio/sell
 */
export const sellInstrument = async (instrumentSymbol: string, quantity: number, portfolioId: string): Promise<void> => {
    await privateApi.post('/api/portfolio/sell', { instrumentSymbol, quantity, portfolioId });
};
