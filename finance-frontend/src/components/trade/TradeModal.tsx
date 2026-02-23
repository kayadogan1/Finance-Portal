import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { privateApi } from "../../services/api";

const tradeSchema = z.object({
    quantity: z.number().positive("Miktar 0'dan büyük olmalıdır"),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string | null;
    side: "BUY" | "SELL" | null;
}

export function TradeModal({ isOpen, onClose, symbol, side }: TradeModalProps) {
    const queryClient = useQueryClient();
    const [errorText, setErrorText] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<TradeFormValues>({
        resolver: zodResolver(tradeSchema),
        defaultValues: { quantity: 1 },
    });

    const mutation = useMutation({
        mutationFn: async (data: TradeFormValues) => {
            const endpoint = side === "BUY" ? "/api/portfolio/buy" : "/api/portfolio/sell";
            const response = await privateApi.post(endpoint, {
                symbol,
                quantity: data.quantity,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-history"] });
            onClose();
            reset();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (error: any) => {
            setErrorText(error.response?.data?.message || "İşlem başarısız oldu.");
        },
    });

    const onSubmit = (data: TradeFormValues) => {
        setErrorText(null);
        if (!symbol || !side) return;
        mutation.mutate(data);
    };

    if (!symbol || !side) return null;

    const isBuy = side === "BUY";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-slate-100 border-slate-800">
                <DialogHeader>
                    <DialogTitle>
                        {isBuy ? "Satın Al" : "Sat"}: {symbol}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {symbol} için işlem miktarını giriniz.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block text-slate-300">
                            Miktar
                        </label>
                        <input
                            type="number"
                            step="any"
                            {...register("quantity", { valueAsNumber: true })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                        />
                        {errors.quantity && (
                            <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
                        )}
                        {errorText && <p className="text-red-400 text-sm mt-1">{errorText}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isBuy
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-red-600 hover:bg-red-700"
                                } disabled:opacity-50`}
                        >
                            {mutation.isPending ? "İşleniyor..." : isBuy ? "Satın Al" : "Sat"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
