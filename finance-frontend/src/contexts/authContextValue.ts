import { createContext } from 'react';

export interface AuthInfo {
    isInitialized: boolean;
    isAuthenticated: boolean;
    username: string;
    email: string;
    isAdmin: boolean;
    roles: string[];
    authError: string | null;
    rememberMe: boolean;
    setRememberMe: (value: boolean) => void;
    login: (redirectUri?: string) => void;
    logout: () => void;
    register: (redirectUri?: string) => void;
    refreshToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthInfo | null>(null);
