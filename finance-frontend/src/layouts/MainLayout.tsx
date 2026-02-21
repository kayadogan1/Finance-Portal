import { NavLink, Outlet } from 'react-router-dom';
import { Activity, LayoutDashboard, Wallet, TrendingUp, Newspaper } from 'lucide-react';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/portfolio', label: 'Portföyüm', icon: Wallet },
    { to: '/market', label: 'Piyasalar', icon: TrendingUp },
    { to: '/news', label: 'Haberler', icon: Newspaper },
];

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col">
            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Logo */}
                        <NavLink to="/dashboard" className="flex items-center gap-3 group">
                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105">
                                <Activity className="text-white" size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Finans Portalı</h1>
                                <p className="text-xs text-slate-400">Canlı Piyasa Verileri ve Portföy Takibi</p>
                            </div>
                        </NavLink>

                        {/* Navigation */}
                        <nav className="flex bg-slate-800 rounded-xl p-1 border border-slate-700 shadow-lg">
                            {navItems.map(({ to, label, icon: Icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${isActive
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                        }`
                                    }
                                >
                                    <Icon size={18} />
                                    <span className="hidden sm:inline">{label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="mt-auto py-6 text-center text-slate-600 text-xs border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                    Data provided by Yahoo Finance &amp; Binance APIs via Spring Boot
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
