import { useEffect } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
    const { isInitialized, isAuthenticated, isAdmin, login } = useAuth();

    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            login(window.location.href);
        }
    }, [isAuthenticated, isInitialized, login]);

    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="animate-spin text-primary" size={24} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="animate-spin text-primary" size={24} />
            </div>
        );
    }

    if (requireAdmin && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="p-4 bg-negative/15 rounded mb-6">
                    <ShieldAlert size={48} className="text-negative" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    403 — Erişim Engellendi
                </h2>
                <p className="text-muted-foreground max-w-md">
                    Bu sayfaya erişim yetkiniz bulunmamaktadır.
                    Yönetici haklarına sahip bir hesapla giriş yapmanız gerekmektedir.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
