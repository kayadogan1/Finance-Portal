import { ExternalLink, Clock } from 'lucide-react';
import { TOPIC_LABELS } from '../../services/newsService';

export interface NewsCardProps {
    title: string;
    description?: string;
    url: string;
    urlToImage?: string;
    sourceName?: string;
    publishedAt: string;
    category?: string;
}

const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgNDAwIDIwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxNzFEMjciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMzMjNCNEMiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

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

export default function NewsCard({ title, description, url, urlToImage, sourceName, publishedAt, category }: NewsCardProps) {
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="group block card-base !p-0 overflow-hidden">
            {/* Thumbnail */}
            <div className="relative h-36 overflow-hidden bg-card">
                <img src={urlToImage || fallbackImage} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    onError={e => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                {sourceName && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-sm bg-background/80 text-primary backdrop-blur-sm">
                        {sourceName}
                    </span>
                )}
                {category && (
                    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded-sm bg-primary/10 text-primary">
                        {TOPIC_LABELS[category] || category}
                    </span>
                )}
            </div>

            <div className="p-4 space-y-2">
                <h3 className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{title}</h3>
                {description && <p className="text-meta line-clamp-2 leading-relaxed">{description}</p>}
                <div className="flex items-center justify-between pt-0.5">
                    <span className="text-meta flex items-center gap-1"><Clock size={10} />{timeAgo(publishedAt)}</span>
                    <ExternalLink size={10} className="text-ghost opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </a>
    );
}
