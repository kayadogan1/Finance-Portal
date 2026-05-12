import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chart from 'react-apexcharts';
import {
    getLineData,
    searchMarketInstrumentsPaged,
    type BackendInstrumentType,
} from '../../services/marketService';
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SymbolPickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

type PickerCategory = 'stock' | 'crypto' | 'forex' | 'commodity' | 'indices';

const PICKER_PAGE_SIZE = 12;

const PICKER_CATEGORIES: { key: PickerCategory; label: string }[] = [
    { key: 'stock', label: 'Hisse' },
    { key: 'crypto', label: 'Kripto' },
    { key: 'forex', label: 'Döviz' },
    { key: 'commodity', label: 'Emtia' },
    { key: 'indices', label: 'Endeks' },
];

const PICKER_TYPE_MAP: Record<PickerCategory, BackendInstrumentType> = {
    stock: 'STOCK',
    crypto: 'CRYPTO',
    forex: 'FOREX',
    commodity: 'COMMODITY',
    indices: 'INDEX',
};

function SymbolPicker({ value, onChange, placeholder }: SymbolPickerProps) {
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState<PickerCategory>('stock');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);

    const { data: searchPage, isLoading } = useQuery({
        queryKey: ['comparison-instrument-search', category, query.trim(), page],
        queryFn: () => searchMarketInstrumentsPaged({
            q: query,
            type: PICKER_TYPE_MAP[category],
            page,
            size: PICKER_PAGE_SIZE,
        }),
        enabled: open,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
    });

    const pagedOptions = searchPage?.content ?? [];
    const totalPages = Math.max(1, searchPage?.totalPages ?? 1);
    const totalElements = searchPage?.totalElements ?? 0;
    const currentPage = Math.min(page, totalPages - 1);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between flex items-center px-3 h-9 border border-border bg-card text-[13px] rounded text-foreground hover:border-border/60 transition-colors"
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 bg-card border-border shadow-none">
                <Command className="bg-card text-foreground" shouldFilter={false}>
                    <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
                        {PICKER_CATEGORIES.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                    setCategory(item.key);
                                    setPage(0);
                                }}
                                className={cn(
                                    "h-7 rounded border px-2 text-[11px] font-semibold transition-colors",
                                    category === item.key
                                        ? "border-primary/40 bg-primary/15 text-primary"
                                        : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <CommandInput
                        value={query}
                        onValueChange={(value) => {
                            setQuery(value);
                            setPage(0);
                        }}
                        placeholder="Sembol veya ad ara..."
                        className="text-[13px] border-border"
                    />
                    <CommandList>
                        <CommandEmpty>{isLoading ? 'Yükleniyor...' : 'Sonuç bulunamadı.'}</CommandEmpty>
                        <CommandGroup>
                            {pagedOptions.map((opt) => (
                                <CommandItem
                                    key={opt.symbol}
                                    value={opt.symbol}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue.toUpperCase());
                                        setOpen(false);
                                    }}
                                    className="aria-selected:bg-primary/10 aria-selected:text-primary cursor-pointer text-foreground"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary",
                                            value === opt.symbol ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold">{opt.symbol}</div>
                                        <div className="truncate text-[11px] text-muted-foreground">{opt.name}</div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    <div className="flex items-center justify-between border-t border-border px-3 py-2">
                        <span className="text-[11px] text-muted-foreground">
                            {totalElements} sonuç • {currentPage + 1}/{totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={currentPage === 0}
                                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/** Downsample array to at most `maxPoints` evenly spaced items. */
function downsample<T>(arr: T[], maxPoints: number): T[] {
    if (arr.length <= maxPoints) return arr;
    const step = arr.length / maxPoints;
    return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)]);
}

const MAX_CHART_POINTS = 200;

export default function ComparisonChart() {
    const [symbolA, setSymbolA] = useState<string>('BTCUSDT');
    const [symbolB, setSymbolB] = useState<string>('ETHUSDT');

    // FIX 2: Add staleTime so line data doesn't refetch on every focus/render
    const { data: dataA, isLoading: loadingA } = useQuery({
        queryKey: ['market-line', symbolA],
        queryFn: () => getLineData(symbolA),
        enabled: !!symbolA,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
    });

    const { data: dataB, isLoading: loadingB } = useQuery({
        queryKey: ['market-line', symbolB],
        queryFn: () => getLineData(symbolB),
        enabled: !!symbolB,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
    });

    // FIX 3: Downsample before building series to cap render cost
    const chartSeries = useMemo(() => {
        if (!dataA || dataA.length === 0 || !dataB || dataB.length === 0) return [];

        const sampledA = downsample(dataA, MAX_CHART_POINTS);
        const sampledB = downsample(dataB, MAX_CHART_POINTS);

        const initialA = sampledA[0].close;
        const initialB = sampledB[0].close;

        if (initialA === 0 || initialB === 0) return [];

        return [
            {
                name: symbolA,
                data: sampledA.map(d => ({
                    x: d.timestamp,
                    y: parseFloat((((d.close - initialA) / initialA) * 100).toFixed(3)),
                })),
                color: '#10b981',
            },
            {
                name: symbolB,
                data: sampledB.map(d => ({
                    x: d.timestamp,
                    y: parseFloat((((d.close - initialB) / initialB) * 100).toFixed(3)),
                })),
                color: '#3b82f6',
            }
        ];
    }, [dataA, dataB, symbolA, symbolB]);

    // FIX 4: Memoize chart options — prevents Chart re-mount on parent renders
    const chartOptions = useMemo(() => ({
        chart: {
            type: 'line' as const,
            foreColor: 'hsl(var(--muted-foreground))',
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: false },
            // FIX 5: Disable zoom/pan events that trigger redraws
            zoom: { enabled: false },
            selection: { enabled: false },
        },
        stroke: {
            // FIX 6: 'straight' instead of 'smooth' — eliminates bezier curve computation
            curve: 'straight' as const,
            width: 1.5,
        },
        xaxis: {
            type: 'datetime' as const,
            tooltip: { enabled: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                datetimeUTC: false,
                // Reduce label count to avoid overcrowding
                style: { fontSize: '10px' },
            },
        },
        yaxis: {
            labels: {
                formatter: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
                style: { fontSize: '10px' },
            },
        },
        grid: {
            borderColor: 'hsl(var(--ghost-foreground))',
            strokeDashArray: 4,
            yaxis: { lines: { show: true } },
            xaxis: { lines: { show: false } },
        },
        tooltip: {
            theme: 'dark' as const,
            y: {
                formatter: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
            },
            x: {
                format: 'dd MMM yyyy',
            },
            // FIX 7: shared tooltip is cheaper than per-point
            shared: true,
            intersect: false,
        },
        legend: {
            position: 'top' as const,
            horizontalAlign: 'right' as const,
        },
        dataLabels: {
            enabled: false,
        },
        // FIX 8: markers off — each data point marker is expensive to paint
        markers: {
            size: 0,
        },
    }), []); // no deps — options don't depend on dynamic data

    const isLoading = loadingA || loadingB;

    return (
        <div className="card-base">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                <div>
                    <h3 className="text-[14px] font-medium text-foreground">Karşılaştırma Grafiği</h3>
                    <p className="text-meta mt-0.5">Varlıkların % değişim oranını kıyaslayın.</p>
                </div>

                <div className="flex items-center gap-3">
                    <SymbolPicker
                        value={symbolA}
                        onChange={setSymbolA}
                        placeholder="Seç 1"
                    />
                    <span className="text-subtle text-[12px] font-medium">VS</span>
                    <SymbolPicker
                        value={symbolB}
                        onChange={setSymbolB}
                        placeholder="Seç 2"
                    />
                </div>
            </div>

            <div className="h-[360px] w-full bg-background rounded p-2">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : chartSeries.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <p className="text-[13px] text-muted-foreground">Kıyaslanacak veri bulunamadı.</p>
                        <p className="text-meta mt-1">Seçilen semboller için henüz fiyat geçmişi yok.</p>
                    </div>
                ) : (
                    <Chart
                        options={chartOptions}
                        series={chartSeries}
                        type="line"
                        height="100%"
                    />
                )}
            </div>
        </div>
    );
}
