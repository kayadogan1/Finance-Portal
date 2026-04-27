import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { depositFunds } from "../../services/portfolioService";

const depositSchema = z.object({ amount: z.number().positive("Miktar 0'dan büyük olmalıdır") });
type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositModalProps { isOpen: boolean; onClose: () => void; portfolioId: string; }

export function DepositModal({ isOpen, onClose, portfolioId }: DepositModalProps) {
    const queryClient = useQueryClient();
    const [errorText, setErrorText] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<DepositFormValues>({
        resolver: zodResolver(depositSchema), defaultValues: { amount: 100 },
    });

    const mutation = useMutation({
        mutationFn: async (data: DepositFormValues) => depositFunds(data.amount, portfolioId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portfolio"] }); queryClient.invalidateQueries({ queryKey: ["portfolio-history"] }); onClose(); reset(); },
        onError: (error: AxiosError<{ message?: string }>) => { setErrorText(error.response?.data?.message || "Para yatırma işlemi başarısız."); },
    });

    const onSubmit = (data: DepositFormValues) => { setErrorText(null); mutation.mutate(data); };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border shadow-none rounded">
                <DialogHeader>
                    <DialogTitle className="text-[16px] font-semibold">Para Yatır</DialogTitle>
                    <DialogDescription className="text-meta">Portföyünüze nakit bakiye ekleyin.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-3">
                    <div>
                        <label className="text-label mb-1.5 block">Miktar (₺)</label>
                        <input type="number" step="any" {...register("amount", { valueAsNumber: true })} placeholder="100.00"
                            className="w-full h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                        {errors.amount && <p className="text-negative text-[11px] mt-1">{errors.amount.message}</p>}
                    </div>
                    {errorText && <p className="text-negative text-[12px]">{errorText}</p>}
                    <div className="flex justify-end gap-2 pt-3">
                        <button type="button" onClick={onClose} className="px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">İptal</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{mutation.isPending ? "İşleniyor..." : "Yatır"}</button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
