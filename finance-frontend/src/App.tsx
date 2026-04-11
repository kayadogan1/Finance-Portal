import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import PortfolioPage from './pages/PortfolioPage';
import MarketPage from './pages/MarketPage';
import NewsPage from './pages/NewsPage';
import AdminPage from './pages/AdminPage';
import BitcoinPage from './pages/BitcoinPage';
import ForexPage from './pages/ForexPage';
import BondsPage from './pages/BondsPage';
import IndicesPage from './pages/IndicesPage';
import DictionaryPage from './pages/DictionaryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
    return (
        <Routes>
            {/* Landing page — standalone layout */}
            <Route path="/" element={<LandingPage />} />

            {/* App pages — inside MainLayout */}
            <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/bitcoin" element={<BitcoinPage />} />
                <Route path="/forex" element={<ForexPage />} />
                <Route path="/bonds" element={<BondsPage />} />
                <Route path="/indices" element={<IndicesPage />} />
                <Route path="/dictionary" element={<DictionaryPage />} />
                <Route
                    path="/portfolio"
                    element={
                        <ProtectedRoute>
                            <PortfolioPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;