import api from './api';

/* ─────────────────────────────── Backend DTO shapes ─────────────────────────────── */

/** Matches `com.finance.shared.PortfolioDto` */
export interface PortfolioDto {
    portfolioName: string;
    riskTolerance: string;
    purpose: string;
    portfolioItems: PortfolioItemDto[];
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
    const { data } = await api.get<PortfolioDto[]>('/api/portfolio');
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
    const { data } = await api.get<PerformanceLineChartDto[]>(
        '/api/portfolio/history',
        { params: { days: 30 } },
    );

    return {
        timeline: data.map((d) => d.time),
        totalValues: data.map((d) => Number(d.totalPrice)),
    };
};
