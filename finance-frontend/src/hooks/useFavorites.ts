import { useState, useCallback, useEffect } from 'react';
import useAuth from './useAuth';

const STORAGE_KEY_PREFIX = 'finance-portal-favorites';

function resolveStorageKey(userKey: string) {
    return `${STORAGE_KEY_PREFIX}:${userKey}`;
}

function loadFavorites(storageKey: string): string[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveFavorites(storageKey: string, symbols: string[]) {
    localStorage.setItem(storageKey, JSON.stringify(symbols));
}

/**
 * Client-side favorites hook backed by localStorage.
 * When backend exposes a favorites API, swap the implementation here.
 */
export function useFavorites() {
    const { isAuthenticated, username, email } = useAuth();
    const storageKey = resolveStorageKey(
        isAuthenticated ? (username || email || 'authenticated-user') : 'guest',
    );
    const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(storageKey));

    useEffect(() => {
        setFavorites(loadFavorites(storageKey));
    }, [storageKey]);

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === storageKey) setFavorites(loadFavorites(storageKey));
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [storageKey]);

    const toggleFavorite = useCallback((symbol: string) => {
        setFavorites((prev) => {
            const next = prev.includes(symbol)
                ? prev.filter((s) => s !== symbol)
                : [...prev, symbol];
            saveFavorites(storageKey, next);
            return next;
        });
    }, [storageKey]);

    const isFavorite = useCallback(
        (symbol: string) => favorites.includes(symbol),
        [favorites],
    );

    const removeFavorite = useCallback((symbol: string) => {
        setFavorites((prev) => {
            const next = prev.filter((s) => s !== symbol);
            saveFavorites(storageKey, next);
            return next;
        });
    }, [storageKey]);

    return { favorites, toggleFavorite, isFavorite, removeFavorite };
}
