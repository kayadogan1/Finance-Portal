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
import { createPortfolio, RiskTolerance, PortfolioPurposeType } from "../../services/portfolioService";

const createPortfolioSchema = z.object({
    portfolioName: z.string().min(3, "En az 3 karakter olmalıdır").max(50, "En fazla 50 karakter olabilir"),
    riskTolerance: z.nativeEnum(RiskTolerance, { message: "Risk toleransı seçilmelidir" }),
    purpose: z.nativeEnum(PortfolioPurposeType, { message: "Portföy amacı seçilmelidir" }),
});

type CreatePortfolioFormValues = z.infer<typeof createPortfolioSchema>;

interface CreatePortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePortfolioModal({ isOpen, onClose }: CreatePortfolioModalProps) {
    const queryClient = useQueryClient();
    const [errorText, setErrorText] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<CreatePortfolioFormValues>({
        resolver: zodResolver(createPortfolioSchema),
        defaultValues: { riskTolerance: RiskTolerance.MODERATE, purpose: PortfolioPurposeType.GENERAL },
    });

    const mutation = useMutation({
        mutationFn: createPortfolio,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-distribution"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-history"] });
            onClose();
            reset();
        },
        onError: (error: any) => {
            setErrorText(error.response?.data?.message || "Portföy oluşturulamadı.");
        },
    });

    const onSubmit = (data: CreatePortfolioFormValues) => {
        setErrorText(null);
        mutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-slate-100 border-slate-800">
                <DialogHeader>
                    <DialogTitle>Yeni Portföy Oluştur</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Yatırımlarınızı yönetmek için bir portföy adı ve amacınızı belirleyin.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block text-slate-300">Portföy Adı</label>
                        <input
                            type="text"
                            {...register("portfolioName")}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Ana Portföy"
                        />
                        {errors.portfolioName && <p className="text-red-400 text-xs mt-1">{errors.portfolioName.message}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block text-slate-300">Risk Toleransı</label>
                        <select
                            {...register("riskTolerance")}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value={RiskTolerance.CONSERVATIVE}>Muhafazakar (Düşük Risk)</option>
                            <option value={RiskTolerance.MODERATE}>Dengeli (Orta Risk)</option>
                            <option value={RiskTolerance.AGGRESSIVE}>Agresif (Yüksek Risk)</option>
                            <option value={RiskTolerance.UNDEFINED}>Belirtilmemiş</option>
                        </select>
                        {errors.riskTolerance && <p className="text-red-400 text-xs mt-1">{errors.riskTolerance.message}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block text-slate-300">Portföy Amacı</label>
                        <select
                            {...register("purpose")}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value={PortfolioPurposeType.LONG_TERM_SAVINGS}>Uzun Vadeli Birikim</option>
                            <option value={PortfolioPurposeType.RETIREMENT}>Emeklilik</option>
                            <option value={PortfolioPurposeType.SHORT_TERM_TRADING}>Kısa Vadeli Alım-Satım</option>
                            <option value={PortfolioPurposeType.INCOME_GENERATION}>Gelir Odaklı</option>
                            <option value={PortfolioPurposeType.CAPITAL_PRESERVATION}>Sermaye Koruma</option>
                            <option value={PortfolioPurposeType.SPECULATION}>Spekülatif</option>
                            <option value={PortfolioPurposeType.EDUCATION_FUND}>Eğitim Fonu</option>
                            <option value={PortfolioPurposeType.HOUSE_FUND}>Ev Alma Fonu</option>
                            <option value={PortfolioPurposeType.EMERGENCY_FUND}>Acil Durum Fonu</option>
                            <option value={PortfolioPurposeType.GENERAL}>Genel Amaçlı</option>
                        </select>
                        {errors.purpose && <p className="text-red-400 text-xs mt-1">{errors.purpose.message}</p>}
                    </div>

                    {errorText && <p className="text-red-400 text-sm mt-1">{errorText}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                            {mutation.isPending ? "Oluşturuluyor..." : "Portföy Oluştur"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
