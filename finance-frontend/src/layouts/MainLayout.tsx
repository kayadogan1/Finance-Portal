import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Activity,
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Newspaper,
    Shield,
    LogIn,
    UserPlus,
    User,
    LogOut,
    ChevronDown,
    Compass,
    Bitcoin,
    DollarSign,
    Landmark,
    BarChart2,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';

const EXPLORE_ITEMS = [
    { to: '/bitcoin', label: 'Kripto', icon: Bitcoin },
    { to: '/forex', label: 'Döviz', icon: DollarSign },
    { to: '/bonds', label: 'Tahvil & Bono', icon: Landmark },
    { to: '/indices', label: 'Endeksler', icon: BarChart2 },
];

const MainLayout = () => {
    const { isAuthenticated, username, isAdmin, login, logout, register } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [exploreOpen, setExploreOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const exploreRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
                setExploreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    /* ─── Nav items (dynamic based on role) ─── */
    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/portfolio', label: 'Portföyüm', icon: Wallet },
        { to: '/market', label: 'Piyasalar', icon: TrendingUp },
        { to: '/news', label: 'Haberler', icon: Newspaper },
        ...(isAdmin
            ? [{ to: '/admin', label: 'Admin', icon: Shield }]
            : []),
    ];

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

                        {/* Navigation + Auth */}
                        <div className="flex items-center gap-3">
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

                                {/* Explore dropdown trigger */}
                                <div className="relative" ref={exploreRef}>
                                    <button
                                        onClick={() => setExploreOpen((prev) => !prev)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200
                                                   text-slate-400 hover:text-white hover:bg-slate-700/50"
                                    >
                                        <Compass size={18} />
                                        <span className="hidden sm:inline">Keşfet</span>
                                        <ChevronDown
                                            size={12}
                                            className={`text-slate-500 transition-transform ${exploreOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {exploreOpen && (
                                        <div className="absolute right-0 mt-2 w-52 bg-slate-800 border border-slate-700
                                                        rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                                            <div className="py-1">
                                                {EXPLORE_ITEMS.map(({ to, label, icon: Icon }) => (
                                                    <NavLink
                                                        key={to}
                                                        to={to}
                                                        onClick={() => setExploreOpen(false)}
                                                        className={({ isActive }) =>
                                                            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                                                            ${isActive
                                                                ? 'text-emerald-400 bg-emerald-500/10'
                                                                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                            }`
                                                        }
                                                    >
                                                        <Icon size={16} />
                                                        {label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </nav>

                            {/* Auth buttons */}
                            {!isAuthenticated ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={login}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                                                   text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700
                                                   border border-slate-700 rounded-xl transition-colors"
                                    >
                                        <LogIn size={16} />
                                        <span className="hidden sm:inline">Giriş Yap</span>
                                    </button>
                                    <button
                                        onClick={register}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                                                   text-white bg-emerald-500 hover:bg-emerald-600
                                                   rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        <UserPlus size={16} />
                                        <span className="hidden sm:inline">Kayıt Ol</span>
                                    </button>
                                </div>
                            ) : (
                                /* User dropdown */
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen((prev) => !prev)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                                                   text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700
                                                   border border-slate-700 rounded-xl transition-colors"
                                    >
                                        <div className="w-7 h-7 bg-emerald-500/20 border border-emerald-500/40 rounded-lg
                                                        flex items-center justify-center">
                                            <User size={14} className="text-emerald-400" />
                                        </div>
                                        <span className="hidden sm:inline max-w-[120px] truncate">{username}</span>
                                        <ChevronDown
                                            size={14}
                                            className={`text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700
                                                        rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                                            {/* User info */}
                                            <div className="px-4 py-3 border-b border-slate-700/60">
                                                <p className="text-sm font-medium text-white truncate">{username}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {isAdmin ? 'Yönetici' : 'Kullanıcı'}
                                                </p>
                                            </div>

                                            {/* Menu items */}
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setDropdownOpen(false);
                                                        logout();
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                                               text-red-400 hover:bg-slate-700/50 transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    Çıkış Yap
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
