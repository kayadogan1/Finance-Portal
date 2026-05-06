import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chart from 'react-apexcharts';
import { getLineData, getMarketInstrumentCatalog } from '../../services/marketService';
import { Check, ChevronsUpDown } from "lucide-react";
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
    options: { symbol: string; name: string }[];
    placeholder: string;
}

function SymbolPicker({ value, onChange, options, placeholder }: SymbolPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between flex items-center px-3 h-9 border border-border bg-card text-[13px] rounded text-foreground hover:border-border/60 transition-colors"
                >
                    {value
                        ? options.find((opt) => opt.symbol === value)?.symbol || value
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-card border-border shadow-none">
                <Command className="bg-card text-foreground">
                    <CommandInput placeholder="Sembol ara..." className="text-[13px] border-border" />
                    <CommandList>
                        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
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
                                    {opt.symbol}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
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

    // FIX 1: Use catalog (already cached 30min in callers) with explicit staleTime
    const { data: instruments = [] } = useQuery({
        queryKey: ['market-instrument-catalog'],
        queryFn: getMarketInstrumentCatalog,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
    });

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
                        options={instruments}
                        placeholder="Seç 1"
                    />
                    <span className="text-subtle text-[12px] font-medium">VS</span>
                    <SymbolPicker
                        value={symbolB}
                        onChange={setSymbolB}
                        options={instruments}
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
