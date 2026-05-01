import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import keycloak from '../utils/keycloak';
import { AuthContext, type AuthInfo } from './authContextValue';

let keycloakInitPromise: Promise<boolean> | null = null;
const REMEMBER_ME_KEY = 'finance-portal-remember-me';
const REMEMBERED_USERNAME_KEY = 'finance-portal-remembered-username';

const getRoles = () => {
    const token = keycloak.tokenParsed;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'finance-gateway-client';
    const clientRoles = token?.resource_access?.[clientId]?.roles ?? [];
    const realmRoles = token?.realm_access?.roles ?? [];
    return [...new Set([...clientRoles, ...realmRoles])];
};

const isAdminRole = (roles: string[]) => roles.some((role) => role.toUpperCase() === 'ADMIN');

const initKeycloakOnce = () => {
    if (!keycloakInitPromise) {
        keycloakInitPromise = keycloak.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            checkLoginIframe: false,
            pkceMethod: 'S256',
        });
    }
    return keycloakInitPromise;
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [roles, setRoles] = useState<string[]>([]);
    const [authError, setAuthError] = useState<string | null>(null);
    const [rememberMe, setRememberMeState] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    });

    const syncAuthState = useCallback(() => {
        const authenticated = keycloak.authenticated ?? false;
        const parsed = keycloak.tokenParsed;
        const nextRoles = authenticated ? getRoles() : [];

        setIsAuthenticated(authenticated);
        setUsername(
            authenticated
                ? parsed?.preferred_username ?? parsed?.name ?? 'User'
                : '',
        );
        setEmail(authenticated ? parsed?.email ?? '' : '');
        setRoles(nextRoles);
    }, []);

    const setRememberMe = useCallback((value: boolean) => {
        setRememberMeState(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(REMEMBER_ME_KEY, String(value));
            if (!value) {
                window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
            }
        }
    }, []);

    const refreshToken = useCallback(async () => {
        if (!keycloak.authenticated) return false;
        const refreshed = await keycloak.updateToken(30);
        syncAuthState();
        return refreshed;
    }, [syncAuthState]);

    const login = useCallback((redirectUri?: string) => {
        const rememberedUsername = typeof window !== 'undefined'
            ? window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? undefined
            : undefined;
        keycloak.login({
            redirectUri: redirectUri ?? `${window.location.origin}/dashboard`,
            loginHint: rememberMe ? rememberedUsername : undefined,
            scope: rememberMe ? 'openid profile email offline_access' : 'openid profile email',
        });
    }, [rememberMe]);

    const logout = useCallback(() => {
        keycloak.logout({ redirectUri: window.location.origin });
    }, []);

    const register = useCallback((redirectUri?: string) => {
        keycloak.register({
            redirectUri: redirectUri ?? `${window.location.origin}/dashboard`,
            scope: rememberMe ? 'openid profile email offline_access' : 'openid profile email',
        });
    }, [rememberMe]);

    useEffect(() => {
        let mounted = true;

        keycloak.onAuthSuccess = syncAuthState;
        keycloak.onAuthRefreshSuccess = syncAuthState;
        keycloak.onAuthLogout = syncAuthState;
        keycloak.onTokenExpired = () => {
            refreshToken().catch(() => {
                setAuthError('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
                syncAuthState();
            });
        };

        initKeycloakOnce()
            .then(() => {
                if (!mounted) return;
                syncAuthState();
                setAuthError(null);
            })
            .catch((error) => {
                if (!mounted) return;
                console.error('Keycloak initialization failed:', error);
                setAuthError('Kimlik doğrulama servisine ulaşılamıyor.');
                syncAuthState();
            })
            .finally(() => {
                if (mounted) setIsInitialized(true);
            });

        return () => {
            mounted = false;
        };
    }, [refreshToken, syncAuthState]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (rememberMe && username) {
            window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
        }
        if (!rememberMe) {
            window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        }
    }, [rememberMe, username]);

    const value = useMemo<AuthInfo>(() => ({
        isInitialized,
        isAuthenticated,
        username,
        email,
        isAdmin: isAdminRole(roles),
        roles,
        authError,
        rememberMe,
        setRememberMe,
        login,
        logout,
        register,
        refreshToken,
    }), [
        authError,
        email,
        isAuthenticated,
        isInitialized,
        login,
        logout,
        rememberMe,
        refreshToken,
        register,
        roles,
        setRememberMe,
        username,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
