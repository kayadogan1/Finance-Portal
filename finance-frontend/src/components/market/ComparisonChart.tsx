import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chart from 'react-apexcharts';
import { getLineData, getMarketInstruments } from '../../services/marketService';
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

export default function ComparisonChart() {
    const [symbolA, setSymbolA] = useState<string>('BTCUSDT');
    const [symbolB, setSymbolB] = useState<string>('ETHUSDT');

    const { data: instruments = [] } = useQuery({
        queryKey: ['market-instruments'],
        queryFn: getMarketInstruments,
    });

    /*
     * RULE 1: ComparisonChart is a LINE chart.
     * Uses getLineData → GET /api/market/line/{symbol}?dateTime=
     * Returns ParsedLinePoint[] = { timestamp (UNIX ms), label, close }
     */
    const { data: dataA, isLoading: loadingA } = useQuery({
        queryKey: ['market-line', symbolA],
        queryFn: () => getLineData(symbolA),
        enabled: !!symbolA,
    });

    const { data: dataB, isLoading: loadingB } = useQuery({
        queryKey: ['market-line', symbolB],
        queryFn: () => getLineData(symbolB),
        enabled: !!symbolB,
    });

    const chartSeries = useMemo(() => {
        // RULE 3: Validate data before building series
        if (!dataA || dataA.length === 0 || !dataB || dataB.length === 0) return [];

        const initialA = dataA[0].close;
        const initialB = dataB[0].close;

        if (initialA === 0 || initialB === 0) return [];

        return [
            {
                name: symbolA,
                data: dataA.map(d => ({
                    x: d.timestamp,  // UNIX ms — parsed by service layer
                    y: ((d.close - initialA) / initialA) * 100,
                })),
                color: '#10b981',
            },
            {
                name: symbolB,
                data: dataB.map(d => ({
                    x: d.timestamp,  // UNIX ms — parsed by service layer
                    y: ((d.close - initialB) / initialB) * 100,
                })),
                color: '#3b82f6',
            }
        ];
    }, [dataA, dataB, symbolA, symbolB]);

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

            <div className="h-[400px] w-full bg-background rounded p-2">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : chartSeries.length === 0 ? (
                    /* RULE 3: Empty data fallback */
                    <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <p className="text-[13px] text-muted-foreground">Kıyaslanacak veri bulunamadı.</p>
                        <p className="text-meta mt-1">Seçilen semboller için henüz fiyat geçmişi yok.</p>
                    </div>
                ) : (
                    <Chart
                        options={{
                            chart: {
                                type: 'line',
                                foreColor: 'hsl(var(--muted-foreground))',
                                toolbar: { show: false },
                                background: 'transparent',
                                animations: { enabled: false },
                            },
                            stroke: {
                                curve: 'smooth',
                                width: 2,
                            },
                            xaxis: {
                                type: 'datetime',
                                tooltip: { enabled: false },
                                axisBorder: { show: false },
                                axisTicks: { show: false },
                                labels: {
                                    datetimeUTC: false,
                                },
                            },
                            yaxis: {
                                labels: {
                                    formatter: (val) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
                                },
                            },
                            grid: {
                                borderColor: 'hsl(var(--ghost-foreground))',
                                strokeDashArray: 4,
                                yaxis: { lines: { show: true } },
                            },
                            tooltip: {
                                theme: 'dark',
                                y: {
                                    formatter: (val) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
                                },
                                x: {
                                    format: 'dd MMM yyyy HH:mm',
                                },
                            },
                            legend: {
                                position: 'top',
                                horizontalAlign: 'right',
                            },
                            dataLabels: {
                                enabled: false,
                            },
                        }}
                        series={chartSeries}
                        type="line"
                        height="100%"
                    />
                )}
            </div>
        </div>
    );
}
