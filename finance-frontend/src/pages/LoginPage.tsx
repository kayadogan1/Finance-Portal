import { Navigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const LoginPage = () => {
    const { isAuthenticated, login, register, rememberMe, setRememberMe } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-4">
            <div className="w-full max-w-[380px] rounded border border-border bg-card p-6 shadow-sm">
                <div className="mb-6">
                    <p className="text-label">TradeChart</p>
                    <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.2px] text-foreground">
                        Giriş Yap
                    </h1>
                    <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                        Hesabınıza devam etmek için kimlik doğrulama ekranına geçin.
                    </p>
                </div>

                <label className="mb-5 flex cursor-pointer items-start gap-3 rounded border border-border bg-background/60 p-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                    />
                    <span>
                        <span className="block font-medium text-foreground">Beni hatırla</span>
                        <span className="mt-1 block text-[12px] leading-5">
                            Oturumu daha uzun süre açık tutmak için kullanılır.
                        </span>
                    </span>
                </label>

                <div className="space-y-2">
                    <button
                        onClick={() => login()}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded bg-primary text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <LogIn size={15} />
                        Giriş Yap
                    </button>
                    <button
                        onClick={() => register()}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded border border-border bg-transparent text-[13px] font-semibold text-foreground transition-colors hover:bg-white/5"
                    >
                        <UserPlus size={15} />
                        Kayıt Ol
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
