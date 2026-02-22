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

/**
 * Initialize Keycloak before rendering the React app.
 * `onLoad: 'login-required'` ensures the user is authenticated
 * before any UI is shown.
 */
keycloak
  .init({ onLoad: 'login-required', checkLoginIframe: false })
  .then((authenticated) => {
    if (authenticated) {
      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </StrictMode>,
      );
    } else {
      // Should not happen with 'login-required', but safety net
      keycloak.login();
    }
  })
  .catch((err) => {
    console.error('Keycloak initialization failed:', err);
    document.getElementById('root')!.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;
                        background:#0f172a;color:#ef4444;font-family:system-ui;text-align:center;padding:2rem;">
                <div>
                    <h2 style="font-size:1.5rem;margin-bottom:0.5rem;">Authentication Service Unavailable</h2>
                    <p style="color:#94a3b8;">Unable to connect to the authentication server.<br/>
                    Please ensure the Keycloak server is running at <code>http://localhost:9090</code>.</p>
                </div>
            </div>
        `;
  });
