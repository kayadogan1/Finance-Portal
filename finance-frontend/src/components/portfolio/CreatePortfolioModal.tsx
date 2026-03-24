import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { createPortfolio, RiskTolerance, PortfolioPurposeType } from "../../services/portfolioService";

const createPortfolioSchema = z.object({
    portfolioName: z.string().min(3, "En az 3 karakter olmalıdır").max(50, "En fazla 50 karakter olabilir"),
    riskTolerance: z.nativeEnum(RiskTolerance, { message: "Risk toleransı seçilmelidir" }),
    purpose: z.nativeEnum(PortfolioPurposeType, { message: "Portföy amacı seçilmelidir" }),
});

type CreatePortfolioFormValues = z.infer<typeof createPortfolioSchema>;

interface CreatePortfolioModalProps { isOpen: boolean; onClose: () => void; }

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
            onClose(); reset();
        },
        onError: (error: any) => { setErrorText(error.response?.data?.message || "Portföy oluşturulamadı."); },
    });

    const onSubmit = (data: CreatePortfolioFormValues) => { setErrorText(null); mutation.mutate(data); };

    const inputCls = "w-full h-9 bg-background border border-border rounded px-3 text-[13px] text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border shadow-none rounded">
                <DialogHeader>
                    <DialogTitle className="text-[16px] font-semibold">Yeni Portföy Oluştur</DialogTitle>
                    <DialogDescription className="text-meta">Yatırımlarınızı yönetmek için bir portföy oluşturun.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-3">
                    <div>
                        <label className="text-label mb-1.5 block">Portföy Adı</label>
                        <input type="text" {...register("portfolioName")} className={inputCls} placeholder="Ana Portföy" />
                        {errors.portfolioName && <p className="text-negative text-[11px] mt-1">{errors.portfolioName.message}</p>}
                    </div>
                    <div>
                        <label className="text-label mb-1.5 block">Risk Toleransı</label>
                        <select {...register("riskTolerance")} className={inputCls}>
                            <option value={RiskTolerance.CONSERVATIVE}>Muhafazakar (Düşük Risk)</option>
                            <option value={RiskTolerance.MODERATE}>Dengeli (Orta Risk)</option>
                            <option value={RiskTolerance.AGGRESSIVE}>Agresif (Yüksek Risk)</option>
                            <option value={RiskTolerance.UNDEFINED}>Belirtilmemiş</option>
                        </select>
                        {errors.riskTolerance && <p className="text-negative text-[11px] mt-1">{errors.riskTolerance.message}</p>}
                    </div>
                    <div>
                        <label className="text-label mb-1.5 block">Portföy Amacı</label>
                        <select {...register("purpose")} className={inputCls}>
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
                        {errors.purpose && <p className="text-negative text-[11px] mt-1">{errors.purpose.message}</p>}
                    </div>
                    {errorText && <p className="text-negative text-[12px]">{errorText}</p>}
                    <div className="flex justify-end gap-2 pt-3">
                        <button type="button" onClick={onClose} className="px-4 h-9 rounded text-[13px] font-medium bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">İptal</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 h-9 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{mutation.isPending ? "Oluşturuluyor..." : "Portföy Oluştur"}</button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
