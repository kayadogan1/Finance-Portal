import axios from 'axios';
import keycloak from '../utils/keycloak';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Backend wraps ALL responses in: { success, data, message, response, timestamp }
 * This interceptor auto-unwraps so service functions receive only the inner `data`.
 */
function unwrapResponse(response: import('axios').AxiosResponse) {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        response.data = body.data;
    }
    return response;
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
        if (keycloak.authenticated) {
            try {
                await keycloak.updateToken(30);
            } catch {
                keycloak.login();
                return Promise.reject(new Error('Token refresh failed'));
            }
            config.headers.Authorization = `Bearer ${keycloak.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

privateApi.interceptors.response.use(
    unwrapResponse,
    (error) => {
        const status = error.response?.status;
        if (status === 401 && keycloak.authenticated) {
            keycloak.login();
        }
        return Promise.reject(error);
    },
);
