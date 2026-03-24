import type { MarketInstrument } from "@/services/marketService";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface InstrumentsTableProps {
    instruments: MarketInstrument[];
    onSelectSymbol?: (symbol: string) => void;
    selectedSymbol?: string;
}

export function InstrumentsTable({ instruments, onSelectSymbol, selectedSymbol }: InstrumentsTableProps) {
    if (!instruments.length) {
        return <div className="text-center py-8 text-[13px] text-subtle">Bu kategoride enstrüman bulunamadı.</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-label py-2.5 h-auto">Sembol</TableHead>
                    <TableHead className="text-label py-2.5 h-auto">İsim</TableHead>
                    <TableHead className="text-label py-2.5 h-auto text-right">Fiyat</TableHead>
                    <TableHead className="text-label py-2.5 h-auto text-right">24s Değişim</TableHead>
                    <TableHead className="text-label py-2.5 h-auto text-right w-[70px]">Detay</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
                {instruments.map((inst) => {
                    const isPositive = (inst.change24h || 0) >= 0;
                    const isSelected = selectedSymbol === inst.symbol;
                    return (
                        <TableRow
                            key={inst.symbol}
                            className={`h-11 cursor-pointer transition-colors duration-150 border-0 ${isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
                            onClick={() => onSelectSymbol?.(inst.symbol)}
                        >
                            <TableCell className="text-[13px] font-semibold text-foreground py-0 w-24">{inst.symbol}</TableCell>
                            <TableCell className="text-[13px] text-muted-foreground py-0 truncate max-w-[180px]">{inst.name}</TableCell>
                            <TableCell className="text-right text-[13px] font-medium tabular-nums text-foreground py-0">
                                {(inst.currentPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </TableCell>
                            <TableCell className="text-right py-0">
                                <span className={isPositive ? 'badge-positive' : 'badge-negative'}>
                                    {isPositive ? '+' : ''}{(inst.change24h || 0).toFixed(2)}%
                                </span>
                            </TableCell>
                            <TableCell className="text-right py-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSelectSymbol?.(inst.symbol); }}
                                    className="text-[12px] font-medium text-ghost hover:text-foreground transition-colors"
                                >
                                    Detay →
                                </button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
