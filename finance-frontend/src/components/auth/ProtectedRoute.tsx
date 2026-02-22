import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
    const { isAuthenticated, isAdmin, login } = useAuth();

    if (!isAuthenticated) {
        // Trigger login flow — shouldn't normally happen with 'login-required' init
        login();
        return <Navigate to="/dashboard" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="p-4 bg-red-500/15 rounded-2xl mb-6">
                    <ShieldAlert size={48} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    403 — Erişim Engellendi
                </h2>
                <p className="text-slate-400 max-w-md">
                    Bu sayfaya erişim yetkiniz bulunmamaktadır.
                    Yönetici haklarına sahip bir hesapla giriş yapmanız gerekmektedir.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
