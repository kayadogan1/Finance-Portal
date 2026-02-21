import { LayoutDashboard } from 'lucide-react';

const DashboardPage = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6">
                <LayoutDashboard className="text-emerald-400" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Dashboard</h2>
            <p className="text-slate-400 max-w-md">
                Your financial overview will appear here. Portfolio summaries, market trends, and quick actions — all in one place.
            </p>
            <span className="mt-6 px-4 py-2 rounded-full bg-slate-800 text-slate-500 text-sm border border-slate-700">
                Coming Soon
            </span>
        </div>
    );
};

export default DashboardPage;
