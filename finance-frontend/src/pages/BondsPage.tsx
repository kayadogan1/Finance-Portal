import { BarChart3, Info } from 'lucide-react';
import NewsGrid from '../components/news/NewsGrid';

const BondsPage = () => (
    <div className="space-y-6">
        <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-foreground">Tahvil & Bono</h2>
            <p className="text-meta">Makroekonomik gelişmeleri ve faiz piyasalarını takip edin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
                { label: '10Y US Treasury', value: '4.25%', note: 'Son güncelleme: Piyasa açılışı' },
                { label: '2Y US Treasury', value: '4.65%', note: 'Son güncelleme: Piyasa açılışı' },
                { label: 'TCMB Politika Faizi', value: '45.00%', note: 'Son güncelleme: 2025 Q4' },
            ].map(({ label, value, note }) => (
                <div key={label} className="card-base">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={13} className="text-warning" />
                        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-price">{value}</p>
                    <p className="text-meta mt-1">{note}</p>
                </div>
            ))}
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded bg-warning/[0.04] border border-warning/10">
            <Info size={14} className="text-warning shrink-0 mt-0.5" />
            <div>
                <p className="text-[12px] font-medium text-warning">Tahvil Verileri</p>
                <p className="text-meta mt-0.5">Canlı tahvil fiyatı verileri henüz backend tarafında mevcut değildir. Referans değerler statik olarak gösterilmektedir.</p>
            </div>
        </div>

        <div className="card-base"><NewsGrid topic="BOND" title="Tahvil/Bono Haberleri" columns={3} maxItems={12} /></div>
    </div>
);

export default BondsPage;
