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
import { depositFunds } from "../../services/portfolioService";

const depositSchema = z.object({
    amount: z.number().positive("Yatırılacak miktar 0'dan büyük olmalıdır"),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    portfolioId: string;
}

export function DepositModal({ isOpen, onClose, portfolioId }: DepositModalProps) {
    const queryClient = useQueryClient();
    const [errorText, setErrorText] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<DepositFormValues>({
        resolver: zodResolver(depositSchema),
        defaultValues: { amount: 100 },
    });

    const mutation = useMutation({
        mutationFn: async (data: DepositFormValues) => {
            return depositFunds(data.amount, portfolioId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-history"] });
            onClose();
            reset();
        },
        onError: (error: any) => {
            setErrorText(error.response?.data?.message || "Para yatırma işlemi başarısız.");
        },
    });

    const onSubmit = (data: DepositFormValues) => {
        setErrorText(null);
        mutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-slate-100 border-slate-800">
                <DialogHeader>
                    <DialogTitle>Para Yatır</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Portföyünüze nakit bakiye ekleyin.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block text-slate-300">Miktar (₺)</label>
                        <input
                            type="number"
                            step="any"
                            {...register("amount", { valueAsNumber: true })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="100.00"
                        />
                        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
                    </div>

                    {errorText && <p className="text-red-400 text-sm mt-1">{errorText}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                            {mutation.isPending ? "İşleniyor..." : "Yatır"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
