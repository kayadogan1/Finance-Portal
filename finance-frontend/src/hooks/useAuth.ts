import { useMemo } from 'react';
import keycloak from '../utils/keycloak';

export interface AuthInfo {
    isAuthenticated: boolean;
    username: string;
    isAdmin: boolean;
    login: () => void;
    logout: () => void;
    register: () => void;
}

/**
 * Custom hook that wraps the global Keycloak instance and exposes
 * authentication state + convenience actions.
 */
const useAuth = (): AuthInfo => {
    const isAuthenticated = keycloak.authenticated ?? false;

    const username = useMemo(() => {
        if (!isAuthenticated) return '';
        return (
            keycloak.tokenParsed?.preferred_username ??
            keycloak.tokenParsed?.name ??
            'User'
        );
    }, [isAuthenticated]);

    const isAdmin = useMemo(() => {
        if (!isAuthenticated || !keycloak.tokenParsed) return false;
        const resourceAccess = keycloak.tokenParsed.resource_access;
        const clientRoles =
            resourceAccess?.['finance-gateway-client']?.roles ?? [];
        const realmRoles = keycloak.tokenParsed.realm_access?.roles ?? [];
        return (
            clientRoles.includes('ADMIN') ||
            realmRoles.includes('ADMIN')
        );
    }, [isAuthenticated]);

    const login = () => keycloak.login();
    const logout = () => keycloak.logout({ redirectUri: window.location.origin });
    const register = () => keycloak.register();

    return { isAuthenticated, username, isAdmin, login, logout, register };
};

export default useAuth;
