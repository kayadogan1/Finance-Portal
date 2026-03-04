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
import { TrendingDown, TrendingUp, Eye } from "lucide-react";

interface InstrumentsTableProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    selectedSymbol?: string;
}

export function InstrumentsTable({
    instruments,
    onSelectSymbol,
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
                        <TableHead className="text-center text-slate-300 font-medium w-[100px]">Detay</TableHead>
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
                                <TableCell className="text-right font-mono font-medium text-slate-200">
                                    ${(instrument.currentPrice || 0).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6,
                                    })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge
                                        variant={isPositive ? "default" : "destructive"}
                                        className={`ml-auto flex w-fit items-center gap-1 font-mono font-medium ${isPositive
                                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                                            : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                                            }`}
                                    >
                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {Math.abs(instrument.change24h || 0).toFixed(2)}%
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectSymbol?.(instrument.symbol);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                                   bg-slate-700/40 text-slate-300 hover:bg-slate-600/50 hover:text-white
                                                   border border-slate-600/40 transition-all"
                                    >
                                        <Eye size={12} />
                                        Detay
                                    </button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
