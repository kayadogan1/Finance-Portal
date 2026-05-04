import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { privateApi } from "../../services/api";
import { getPortfolios } from "../../services/portfolioService";

const tradeSchema = z.object({ quantity: z.number().positive("Miktar 0'dan büyük olmalıdır") });
type TradeFormValues = z.infer<typeof tradeSchema>;

interface TradeModalProps { isOpen: boolean; onClose: () => void; symbol: string | null; side: "BUY" | "SELL" | null; portfolioId?: string; }

export function TradeModal({ isOpen, onClose, symbol, side, portfolioId }: TradeModalProps) {
    const queryClient = useQueryClient();
    const [errorText, setErrorText] = useState<string | null>(null);

    const { data: portfolios } = useQuery({ queryKey: ['portfolio'], queryFn: getPortfolios, enabled: isOpen && !portfolioId });
    const resolvedPortfolioId = portfolioId ?? portfolios?.[0]?.id;

    const { register, handleSubmit, formState: { errors }, reset } = useForm<TradeFormValues>({
        resolver: zodResolver(tradeSchema), defaultValues: { quantity: 1 },
    });

    const mutation = useMutation({
        mutationFn: async (data: TradeFormValues) => {
            if (!resolvedPortfolioId) throw new Error("Portföy bulunamadı");
            const endpoint = side === "BUY" ? "/api/portfolio/buy" : "/api/portfolio/sell";
            return (await privateApi.post(endpoint, { instrumentSymbol: symbol, quantity: data.quantity, portfolioId: resolvedPortfolioId })).data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["portfolio"], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ["portfolio-history"], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ["portfolio-pie"], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ["portfolio-transactions"], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ["portfolios"], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ["market"], refetchType: 'active' }),
            ]);
            onClose();
            reset();
        },
        onError: (error: AxiosError<{ message?: string }>) => { setErrorText(error.response?.data?.message || error.message || "İşlem başarısız oldu."); },
    });

    const onSubmit = (data: TradeFormValues) => {
        setErrorText(null);
        if (!symbol || !side) return;
        if (!resolvedPortfolioId) { setErrorText("Önce bir portföy oluşturmalısınız."); return; }
        mutation.mutate(data);
    };

    if (!symbol || !side) return null;
    const isBuy = side === "BUY";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border shadow-none rounded">
                <DialogHeader>
                    <DialogTitle className="text-[16px] font-semibold">{isBuy ? "Satın Al" : "Sat"}: {symbol}</DialogTitle>
                    <DialogDescription className="text-meta">{symbol} için işlem miktarını giriniz.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-3">
                    <div>
                        <label className="text-label mb-1.5 block">Miktar</label>
                        <input type="number" step="any" {...register("quantity", { valueAsNumber: true })} placeholder="0.00"
                            className="w-full h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                        {errors.quantity && <p className="text-negative text-[11px] mt-1">{errors.quantity.message}</p>}
                        {errorText && <p className="text-negative text-[12px] mt-1">{errorText}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                        <button type="button" onClick={onClose} className="px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">İptal</button>
                        <button type="submit" disabled={mutation.isPending || !resolvedPortfolioId}
                            className={`px-4 h-9 rounded text-[13px] font-medium text-white transition-colors disabled:opacity-50 ${isBuy ? 'bg-positive hover:bg-positive/90' : 'bg-negative hover:bg-negative/90'}`}>
                            {mutation.isPending ? "İşleniyor..." : isBuy ? "Satın Al" : "Sat"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
