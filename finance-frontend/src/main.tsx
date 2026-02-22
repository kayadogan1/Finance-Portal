import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import keycloak from './utils/keycloak';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const root = createRoot(document.getElementById('root')!);

/**
 * Render the React app.
 * Called once Keycloak has initialised — regardless of whether
 * the user is authenticated or not, so public pages are always accessible.
 */
const renderApp = () => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
};

/**
 * Initialize Keycloak with `check-sso`.
 * - If the user already has a Keycloak session → they are silently authenticated.
 * - If not → the app renders normally and public pages are accessible.
 * - Protected routes will redirect to login when needed.
 */
keycloak
  .init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    checkLoginIframe: false,
  })
  .then(() => {
    renderApp();
  })
  .catch((err) => {
    console.error('Keycloak initialization failed:', err);
    // Still render the app so public pages remain accessible
    renderApp();
  });
