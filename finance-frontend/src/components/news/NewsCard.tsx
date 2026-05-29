import { ExternalLink, Clock, Crosshair } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TOPIC_LABELS, ASSET_TYPE_COLORS, buildNewsDetailPath, resolveNewsImage, type NewsInstrumentDto } from '../../services/newsService';

export interface NewsCardProps {
    title: string;
    description?: string;
    url: string;
    urlToImage?: string;
    sourceName?: string;
    publishedAt: string;
    category?: string;
    modelName?: string;
    instrumentSymbol?: string;
    instruments?: NewsInstrumentDto[];
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return then.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/** Enstrüman tag'i — tıklanınca /instrument/:symbol sayfasına gider */
function InstrumentTag({ instrument, onClick }: { instrument: NewsInstrumentDto; onClick: (symbol: string) => void }) {
    const color = ASSET_TYPE_COLORS[instrument.assetType] || '#6366f1';
    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(instrument.symbol); }}
            className="inline-flex items-center gap-1 transition-all duration-150 hover:scale-[1.04]"
            style={{
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 4,
                background: `${color}14`,
                color: color,
                border: `1px solid ${color}25`,
                cursor: 'pointer',
                lineHeight: '18px',
                letterSpacing: '0.2px',
            }}
            title={`${instrument.symbol} — ${instrument.assetType}${instrument.score ? ` (${instrument.score})` : ''}`}
        >
            {instrument.primaryMatch && <Crosshair size={8} style={{ opacity: 0.7 }} />}
            {instrument.symbol}
        </button>
    );
}

export default function NewsCard({
    title, description, url, urlToImage, sourceName, publishedAt, category,
    instruments,
}: NewsCardProps) {
    const navigate = useNavigate();
    const visibleInstruments = (instruments || []).slice(0, 4);
    const imageUrl = resolveNewsImage(urlToImage, sourceName, category);
    const detailPath = buildNewsDetailPath(url);

    return (
        <Link to={detailPath} state={{ article: { title, description, url, urlToImage, sourceName, publishedAt, category, instruments } }}
            className="group block card-base !p-0 overflow-hidden">
            {/* Thumbnail */}
            <div className="relative h-28 overflow-hidden bg-card">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    onError={e => { (e.target as HTMLImageElement).src = resolveNewsImage(undefined, sourceName, category); }} />

                {/* Category badge — sağ üst */}
                {category && (
                    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded-sm bg-primary/10 text-primary">
                        {TOPIC_LABELS[category] || category}
                    </span>
                )}


            </div>

            <div className="p-4 space-y-2.5">
                <h3 className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{title}</h3>
                {description && <p className="text-meta text-[12px] line-clamp-2 leading-6">{description}</p>}

                {/* Enstrüman tag'leri */}
                {visibleInstruments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {visibleInstruments.map((inst) => (
                            <InstrumentTag
                                key={`${inst.symbol}-${inst.rankOrder}`}
                                instrument={inst}
                                onClick={(symbol) => navigate(`/instrument/${symbol}`)}
                            />
                        ))}
                        {(instruments || []).length > 4 && (
                            <span style={{ fontSize: 9, color: 'hsl(var(--subtle-foreground))', fontWeight: 500 }}>
                                +{(instruments || []).length - 4}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between pt-0.5">
                    <span className="text-meta flex items-center gap-1"><Clock size={10} />{timeAgo(publishedAt)}</span>
                    {sourceName && <span className="max-w-[120px] truncate text-[10px] font-medium text-subtle">{sourceName}</span>}
                    <ExternalLink size={10} className="text-ghost opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </Link>
    );
}
