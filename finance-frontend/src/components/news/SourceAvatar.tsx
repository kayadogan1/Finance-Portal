import { useMemo } from 'react';

/* ─── Known source logo URLs ─── */
const SOURCE_LOGOS: Record<string, string> = {
    'Bloomberg':    'https://logo.clearbit.com/bloomberg.com',
    'Reuters':      'https://logo.clearbit.com/reuters.com',
    'CNBC':         'https://logo.clearbit.com/cnbc.com',
    'CoinDesk':     'https://logo.clearbit.com/coindesk.com',
    'Financial Times': 'https://logo.clearbit.com/ft.com',
    'Wall Street Journal': 'https://logo.clearbit.com/wsj.com',
    'MarketWatch':  'https://logo.clearbit.com/marketwatch.com',
    'Investing.com':'https://logo.clearbit.com/investing.com',
    'Yahoo Finance':'https://logo.clearbit.com/finance.yahoo.com',
    'Barrons':      'https://logo.clearbit.com/barrons.com',
    'Forbes':       'https://logo.clearbit.com/forbes.com',
    'The Economist':'https://logo.clearbit.com/economist.com',
    'Anadolu Agency':'https://logo.clearbit.com/aa.com.tr',
    'TRT Haber':    'https://logo.clearbit.com/trthaber.com',
    'NTV':          'https://logo.clearbit.com/ntv.com.tr',
    'Dünya':        'https://logo.clearbit.com/dunya.com',
    'Sözcü':        'https://logo.clearbit.com/sozcu.com.tr',
    'CNN Türk':     'https://logo.clearbit.com/cnnturk.com',
    'BBC News':     'https://logo.clearbit.com/bbc.com',
    'The Guardian':  'https://logo.clearbit.com/theguardian.com',
    'Associated Press': 'https://logo.clearbit.com/apnews.com',
    'Business Insider': 'https://logo.clearbit.com/businessinsider.com',
    'Benzinga':     'https://logo.clearbit.com/benzinga.com',
    'Seeking Alpha':'https://logo.clearbit.com/seekingalpha.com',
    'Morningstar':  'https://logo.clearbit.com/morningstar.com',
    'Hürriyet':     'https://logo.clearbit.com/hurriyet.com.tr',
    'Milliyet':     'https://logo.clearbit.com/milliyet.com.tr',
};

/* ─── Deterministic color from string ─── */
const AVATAR_COLORS = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

/* ─── Extract initials ─── */
function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        // Single word: take first 2 chars
        return parts[0].slice(0, 2).toUpperCase();
    }
    // Multiple words: first letter of first two
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ─── Props ─── */
export interface SourceAvatarProps {
    name: string;
    /** 'sm' = 20px, 'md' = 24px, 'lg' = 32px */
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_MAP = { sm: 20, md: 24, lg: 32 };
const FONT_MAP = { sm: 8, md: 9, lg: 11 };

export default function SourceAvatar({ name, size = 'md', className = '' }: SourceAvatarProps) {
    const px = SIZE_MAP[size];
    const fontSize = FONT_MAP[size];
    const logoUrl = SOURCE_LOGOS[name];
    const color = useMemo(() => AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length], [name]);
    const initials = useMemo(() => getInitials(name), [name]);

    return (
        <span
            className={className}
            title={name}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: px,
                height: px,
                borderRadius: '50%',
                flexShrink: 0,
                overflow: 'hidden',
                background: logoUrl ? '#1a1a24' : `${color}18`,
                border: `1px solid ${logoUrl ? 'rgba(255,255,255,0.08)' : `${color}30`}`,
                transition: 'all 0.2s ease',
            }}
        >
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt={name}
                    width={px - 6}
                    height={px - 6}
                    style={{
                        objectFit: 'contain',
                        borderRadius: '50%',
                    }}
                    onError={(e) => {
                        // On load failure, swap to initials fallback
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                            parent.innerHTML = `<span style="font-size:${fontSize}px;font-weight:700;color:${color};letter-spacing:0.3px;line-height:1">${initials}</span>`;
                            parent.style.background = `${color}18`;
                            parent.style.border = `1px solid ${color}30`;
                        }
                    }}
                />
            ) : (
                <span
                    style={{
                        fontSize,
                        fontWeight: 700,
                        color,
                        letterSpacing: '0.3px',
                        lineHeight: 1,
                    }}
                >
                    {initials}
                </span>
            )}
        </span>
    );
}

/* ─── Re-export source badge color helper ─── */
export function getSourceColor(name: string): string {
    return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}
