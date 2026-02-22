import axios from 'axios';
import keycloak from '../utils/keycloak';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor — injects the Keycloak bearer token into every
 * outgoing request. If the token is about to expire (within 30 s),
 * it is silently refreshed first.
 */
api.interceptors.request.use(
    async (config) => {
        if (keycloak.authenticated) {
            try {
                // Refresh the token if it expires within the next 30 seconds
                await keycloak.updateToken(30);
            } catch {
                // Token refresh failed — force re-login
                keycloak.login();
                return Promise.reject(new Error('Token refresh failed'));
            }

            config.headers.Authorization = `Bearer ${keycloak.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

/**
 * Response interceptor — handle 401 globally by redirecting to login.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            keycloak.login();
        }
        return Promise.reject(error);
    },
);

export default api;
