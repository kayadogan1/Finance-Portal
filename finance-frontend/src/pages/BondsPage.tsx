import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';
import {
    formatChangePercent,
    hasChange,
    searchMarketInstrumentsPaged,
    type MarketInstrument,
} from '../services/marketService';
import { formatMarketPrice } from '../utils/currency';

const BOND_PAGE_SIZE = 100;

const getBondInstruments = async (): Promise<MarketInstrument[]> => {
    const firstPage = await searchMarketInstrumentsPaged({
        type: 'BOND',
        page: 0,
        size: BOND_PAGE_SIZE,
    });

    const pages = [firstPage];
    for (let page = 1; page < firstPage.totalPages; page += 1) {
        pages.push(await searchMarketInstrumentsPaged({
            type: 'BOND',
            page,
            size: BOND_PAGE_SIZE,
        }));
    }

    return pages.flatMap((page) => page.content);
};

const BondRow = ({ instrument }: { instrument: MarketInstrument }) => {
    const hasChangeValue = hasChange(instrument);
    const isPositive = hasChangeValue && instrument.change24h >= 0;

    return (
        <Link
            to={`/instrument/${instrument.symbol}`}
            className="grid grid-cols-[92px_1fr_120px_92px_24px] items-center gap-3 px-4 h-12 border-b border-border/60 hover:bg-[hsl(var(--surface-hover))] transition-colors"
        >
            <span className="text-[13px] font-bold text-foreground">{instrument.symbol}</span>
            <span className="min-w-0 truncate text-[12px] font-medium text-muted-foreground">{instrument.name}</span>
            <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                {instrument.hasPrice ? formatMarketPrice(instrument.currentPrice, instrument.baseCurrency) : '-'}
            </span>
            <span className={`inline-flex items-center justify-end gap-1 text-[12px] font-semibold tabular-nums ${!hasChangeValue ? 'text-muted-foreground' : isPositive ? 'text-positive' : 'text-negative'}`}>
                {hasChangeValue && (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                {formatChangePercent(instrument.change24h)}
            </span>
            <ArrowUpRight size={13} className="text-ghost" />
        </Link>
    );
};

const BondsPage = () => {
    const { data: instruments = [], isLoading, isError } = useQuery({
        queryKey: ['market-instruments', 'bond'],
        queryFn: getBondInstruments,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
    });

    const bonds = useMemo(() => {
        return instruments
            .filter((instrument) => instrument.type === 'BOND')
            .sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'));
    }, [instruments]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Tahvil & Bono</h2>
                    <p className="text-meta mt-1">Katalogdaki gerçek tahvil/bono enstrümanları ve faiz piyasası haberleri</p>
                </div>
                <Link
                    to="/market"
                    className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors"
                >
                    <BarChart3 size={13} />
                    Piyasalarda Gör
                </Link>
            </div>

            <div className="card-base !p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                        <p className="text-[14px] font-semibold text-foreground">Tahvil/Bono Listesi</p>
                        <p className="text-meta mt-0.5">Sadece `BOND` tipindeki enstrümanlar listelenir</p>
                    </div>
                    {isLoading && <RefreshCw size={16} className="animate-spin text-primary" />}
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                        <div className="grid grid-cols-[92px_1fr_120px_92px_24px] gap-3 px-4 h-9 items-center border-b border-border bg-[hsl(var(--background-subtle))] text-label">
                            <span>Sembol</span>
                            <span>Ad</span>
                            <span className="text-right">Fiyat</span>
                            <span className="text-right">Değişim</span>
                            <span />
                        </div>

                        {isLoading ? (
                            <div className="py-10 text-center text-meta">Tahvil/bono verileri yükleniyor...</div>
                        ) : isError ? (
                            <div className="py-10 text-center text-[13px] text-negative">Tahvil/bono verileri yüklenemedi.</div>
                        ) : bonds.length === 0 ? (
                            <div className="py-10 text-center text-meta">Katalogda tahvil/bono enstrümanı bulunamadı.</div>
                        ) : (
                            <div>
                                {bonds.map((instrument) => (
                                    <BondRow key={instrument.symbol} instrument={instrument} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card-base">
                <NewsGrid topic="BOND" title="Tahvil/Bono Haberleri" columns={3} maxItems={12} />
            </div>
        </div>
    );
};

export default BondsPage;
