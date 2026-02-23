import type { MarketInstrument } from "@/services/marketService";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";

interface InstrumentsTableProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    onTrade?: (symbol: string, side: "BUY" | "SELL") => void;
    selectedSymbol?: string;
}

export function InstrumentsTable({
    instruments,
    onSelectSymbol,
    onTrade,
    selectedSymbol,
}: InstrumentsTableProps) {
    if (!instruments.length) {
        return (
            <div className="text-center py-8 text-slate-400">
                Bu kategoride enstrüman bulunamadı.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-700/60 overflow-hidden bg-slate-800/20">
            <Table>
                <TableHeader className="bg-slate-800/60">
                    <TableRow className="border-slate-700/60 hover:bg-transparent">
                        <TableHead className="text-slate-300 font-medium">Sembol</TableHead>
                        <TableHead className="text-slate-300 font-medium">İsim</TableHead>
                        <TableHead className="text-right text-slate-300 font-medium">Fiyat</TableHead>
                        <TableHead className="text-right text-slate-300 font-medium">24s Değişim</TableHead>
                        <TableHead className="text-right text-slate-300 font-medium w-[180px]">İşlem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {instruments.map((instrument) => {
                        const isPositive = (instrument.change24h || 0) >= 0;
                        const isSelected = selectedSymbol === instrument.symbol;
                        return (
                            <TableRow
                                key={instrument.symbol}
                                className={`border-slate-700/60 transition-colors cursor-pointer ${isSelected ? "bg-slate-700/40" : "hover:bg-slate-700/20"
                                    }`}
                                onClick={() => onSelectSymbol?.(instrument.symbol)}
                            >
                                <TableCell className="font-semibold text-white">
                                    {instrument.symbol}
                                </TableCell>
                                <TableCell className="text-slate-400">{instrument.name}</TableCell>
                                <TableCell className="text-right font-medium text-slate-200">
                                    ${(instrument.currentPrice || 0).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge
                                        variant={isPositive ? "default" : "destructive"}
                                        className={`ml-auto flex w-fit items-center gap-1 font-medium ${isPositive
                                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                                            : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                                            }`}
                                    >
                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {Math.abs(instrument.change24h || 0).toFixed(2)}%
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTrade?.(instrument.symbol, "BUY");
                                            }}
                                            className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                        >
                                            Al
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTrade?.(instrument.symbol, "SELL");
                                            }}
                                            className="px-3 py-1 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                        >
                                            Sat
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
