import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import keycloak from '../utils/keycloak';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Backend wraps ALL responses in: { success, data, message, response, timestamp }
 * This interceptor auto-unwraps so service functions receive only the inner `data`.
 */
type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<boolean> | null = null;

function unwrapResponse(response: import('axios').AxiosResponse) {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        response.data = body.data;
    }
    return response;
}

function createApiError(code: string, message: string, status?: number) {
    const error = new Error(message);
    error.name = code;
    if (status) {
        Object.assign(error, { status });
    }
    return error;
}

async function refreshTokenOnce() {
    if (!keycloak.authenticated) {
        throw createApiError('AUTH_REQUIRED', 'Bu işlem için giriş yapmanız gerekiyor.', 401);
    }

    if (!refreshPromise) {
        refreshPromise = keycloak.updateToken(30).finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

/**
 * Public API Instance
 * Used strictly for fetching public endpoints (permitAll) without triggering Keycloak login flows.
 */
export const publicApi = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

publicApi.interceptors.response.use(unwrapResponse);

/**
 * Private API Instance
 * With Keycloak interceptors that inject the Bearer token and handle 401 redirects.
 */
export const privateApi = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

privateApi.interceptors.request.use(
    async (config) => {
        if (!keycloak.authenticated) {
            return Promise.reject(createApiError('AUTH_REQUIRED', 'Bu işlem için giriş yapmanız gerekiyor.', 401));
        }

        try {
            await refreshTokenOnce();
            config.headers.Authorization = `Bearer ${keycloak.token}`;
        } catch {
            return Promise.reject(createApiError('SESSION_EXPIRED', 'Oturum süresi doldu. Lütfen tekrar giriş yapın.', 401));
        }

        return config;
    },
    (error) => Promise.reject(error),
);

privateApi.interceptors.response.use(
    unwrapResponse,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as RetriableRequestConfig | undefined;

        if (status === 401 && keycloak.authenticated && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await refreshTokenOnce();
                originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
                return privateApi(originalRequest);
            } catch {
                keycloak.logout({ redirectUri: window.location.origin });
                return Promise.reject(createApiError('SESSION_EXPIRED', 'Oturum süresi doldu. Lütfen tekrar giriş yapın.', 401));
            }
        }

        if (status === 403) {
            return Promise.reject(createApiError('FORBIDDEN', 'Bu işlem için yetkiniz yok.', 403));
        }

        return Promise.reject(error);
    },
);
