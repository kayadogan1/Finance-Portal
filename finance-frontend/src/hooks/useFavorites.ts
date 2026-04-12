import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'finance-portal-favorites';

function loadFavorites(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveFavorites(symbols: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

/**
 * Client-side favorites hook backed by localStorage.
 * When backend exposes a favorites API, swap the implementation here.
 */
export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>(loadFavorites);

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setFavorites(loadFavorites());
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleFavorite = useCallback((symbol: string) => {
        setFavorites((prev) => {
            const next = prev.includes(symbol)
                ? prev.filter((s) => s !== symbol)
                : [...prev, symbol];
            saveFavorites(next);
            return next;
        });
    }, []);

    const isFavorite = useCallback(
        (symbol: string) => favorites.includes(symbol),
        [favorites],
    );

    const removeFavorite = useCallback((symbol: string) => {
        setFavorites((prev) => {
            const next = prev.filter((s) => s !== symbol);
            saveFavorites(next);
            return next;
        });
    }, []);

    return { favorites, toggleFavorite, isFavorite, removeFavorite };
}
