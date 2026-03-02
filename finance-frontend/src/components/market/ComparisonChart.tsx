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
                    className="w-[200px] justify-between flex items-center px-3 py-2 border border-slate-700 bg-slate-800 text-sm rounded-lg text-white hover:bg-slate-700/50 transition-colors"
                >
                    {value
                        ? options.find((opt) => opt.symbol === value)?.symbol || value
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-slate-800 border-slate-700">
                <Command className="bg-slate-800 text-slate-200">
                    <CommandInput placeholder="Sembol ara..." className="text-sm border-slate-700" />
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
                                    className="aria-selected:bg-emerald-500/20 aria-selected:text-emerald-400 cursor-pointer text-slate-200"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-emerald-500",
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
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-semibold text-white">Karşılaştırma Grafiği</h3>
                    <p className="text-slate-400 text-sm">Varlıkların % değişim oranını kıyaslayın.</p>
                </div>

                <div className="flex items-center gap-3">
                    <SymbolPicker
                        value={symbolA}
                        onChange={setSymbolA}
                        options={instruments}
                        placeholder="Seç 1"
                    />
                    <span className="text-slate-500 font-medium text-sm">VS</span>
                    <SymbolPicker
                        value={symbolB}
                        onChange={setSymbolB}
                        options={instruments}
                        placeholder="Seç 2"
                    />
                </div>
            </div>

            <div className="h-[400px] w-full bg-slate-900/30 rounded-xl p-2">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                    </div>
                ) : chartSeries.length === 0 ? (
                    /* RULE 3: Empty data fallback */
                    <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <p className="text-slate-400 text-sm">Kıyaslanacak veri bulunamadı.</p>
                        <p className="text-slate-500 text-xs mt-1">
                            Seçilen semboller için henüz fiyat geçmişi yok.
                        </p>
                    </div>
                ) : (
                    <Chart
                        options={{
                            chart: {
                                type: 'line',
                                foreColor: '#94a3b8',
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
                                borderColor: '#334155',
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
