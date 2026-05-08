import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Newspaper,
    Shield,
    LogIn,
    UserPlus,
    LogOut,
    ChevronDown,
    Bitcoin,
    DollarSign,
    Landmark,
    BarChart2,
    BookOpen,
    Sun,
    Moon,
    User,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import logoIcon from '../assets/logo-icon.svg';
import logoIconDark from '../assets/logo-icon-dark.svg';

const EXPLORE_ITEMS = [
    { to: '/bitcoin', label: 'Kripto', icon: Bitcoin },
    { to: '/forex', label: 'Döviz', icon: DollarSign },
    { to: '/bonds', label: 'Tahvil & Bono', icon: Landmark },
    { to: '/indices', label: 'Endeksler', icon: BarChart2 },
];

const MainLayout = () => {
    const { isAuthenticated, username, isAdmin, login, logout, register } = useAuth();
    const { isDark, toggle: toggleTheme } = useTheme();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [exploreOpen, setExploreOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const exploreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
            if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) setExploreOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const navItems = [
        { to: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
        { to: '/portfolio', label: 'Portföy', icon: Wallet },
        { to: '/market', label: 'Piyasalar', icon: TrendingUp },
        { to: '/news', label: 'Haberler', icon: Newspaper },
        { to: '/dictionary', label: 'Sözlük', icon: BookOpen },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            {/* ─── NAV — 52px, border-bottom, blur ─── */}
            <header className="sticky top-0 z-40 h-13 bg-background/80 backdrop-blur-sm border-b border-border flex items-center">
                <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center justify-between">
                    <NavLink to="/dashboard" className="shrink-0 flex items-center gap-2.5">
                        <img src={isDark ? logoIconDark : logoIcon} alt="TradeChart Logo" className="w-7 h-7" />
                        <span className="hidden md:inline text-[15px] font-bold text-foreground tracking-tight">TradeChart</span>
                    </NavLink>

                    {/* Nav links */}
                    <nav className="flex items-center h-13 gap-1 ml-8">
                        {navItems.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-1.5 px-3 h-full text-[13px] font-medium transition-colors duration-150 ${
                                        isActive
                                            ? 'text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-primary after:rounded-full'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`
                                }
                            >
                                <Icon size={15} />
                                <span className="hidden sm:inline">{label}</span>
                            </NavLink>
                        ))}

                        {/* Explore dropdown */}
                        <div className="relative h-full flex items-center" ref={exploreRef}>
                            <button
                                onClick={() => setExploreOpen(p => !p)}
                                className="flex items-center gap-1.5 px-3 h-full text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
                            >
                                <BarChart2 size={15} />
                                <span className="hidden sm:inline">Keşfet</span>
                                <ChevronDown size={11} className={`text-subtle transition-transform duration-150 ${exploreOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {exploreOpen && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded shadow-none z-50 dropdown-anim">
                                    <div className="py-1">
                                        {EXPLORE_ITEMS.map(({ to, label, icon: Icon }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                onClick={() => setExploreOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                                                        isActive ? 'text-primary bg-white/5' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                                    }`
                                                }
                                            >
                                                <Icon size={14} />
                                                {label}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Theme toggle + Auth */}
                    <div className="shrink-0 ml-auto flex items-center gap-1">
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-8 h-8 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            title={isDark ? 'Aydınlık tema' : 'Karanlık tema'}
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        {!isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => login()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <LogIn size={14} />
                                    <span className="hidden sm:inline">Giriş</span>
                                </button>
                                <button
                                    onClick={() => register()}
                                    className="flex items-center gap-1.5 px-4 h-9 text-[13px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <UserPlus size={14} />
                                    <span className="hidden sm:inline">Kayıt Ol</span>
                                </button>
                            </div>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(p => !p)}
                                    className="flex items-center gap-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <div className="w-[26px] h-[26px] rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary">
                                        {username?.charAt(0)?.toUpperCase() ?? 'U'}
                                    </div>
                                    <span className="hidden sm:inline text-[13px] font-medium max-w-[90px] truncate">{username}</span>
                                    <ChevronDown size={11} className={`text-subtle transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded shadow-none z-50 dropdown-anim">
                                        <div className="px-3 py-2 border-b border-border">
                                            <p className="text-[13px] font-medium text-foreground truncate">{username}</p>
                                            <p className="text-[11px] text-subtle mt-0.5">{isAdmin ? 'Yönetici' : 'Kullanıcı'}</p>
                                        </div>
                                        <div className="py-1">
                                            <NavLink
                                                to="/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                                            >
                                                <User size={14} />
                                                Profil
                                            </NavLink>
                                            <button
                                                onClick={() => { setDropdownOpen(false); logout(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-negative hover:bg-white/5 transition-colors"
                                            >
                                                <LogOut size={14} />
                                                Çıkış Yap
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
