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

const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgNDAwIDIwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxZTI5M2IiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM0NzU1NjkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

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

export default function NewsCard({
    title,
    description,
    url,
    urlToImage,
    sourceName,
    publishedAt,
    category,
}: NewsCardProps) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden
                       hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5
                       transition-all duration-300 hover:-translate-y-0.5"
        >
            {/* Thumbnail */}
            <div className="relative h-40 overflow-hidden bg-slate-900">
                <img
                    src={urlToImage || fallbackImage}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                />
                {/* Source badge */}
                {sourceName && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                                     bg-black/70 text-emerald-400 rounded-md backdrop-blur-sm border border-emerald-500/20">
                        {sourceName}
                    </span>
                )}
                {category && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider
                                     bg-emerald-500/20 text-emerald-300 rounded-md backdrop-blur-sm border border-emerald-500/20">
                        {TOPIC_LABELS[category] || category}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-2.5">
                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2
                               group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>

                {description && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {description}
                    </p>
                )}

                <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock size={12} />
                        {timeAgo(publishedAt)}
                    </span>
                    <ExternalLink size={12} className="text-slate-600 group-hover:text-emerald-500 transition-colors" />
                </div>
            </div>
        </a>
    );
}
