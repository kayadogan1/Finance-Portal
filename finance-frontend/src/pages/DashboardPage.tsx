import { LayoutDashboard, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { getMarketDataHistoryList } from '../services/marketService';
import { getPortfolios } from '../services/portfolioService';
import { getNews } from '../services/newsService';

const DashboardPage = () => {
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testData, setTestData] = useState<any>(null);
    const [testType, setTestType] = useState<string>('');

    const handleTest = async (type: 'market' | 'portfolio' | 'news') => {
        setTestStatus('loading');
        setTestType(type);
        setTestData(null);

        try {
            let data: any;
            if (type === 'market') {
                // Testing market history since 30 days ago
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                data = await getMarketDataHistoryList('BTCUSDT', thirtyDaysAgo.toISOString().split('.')[0]);
            } else if (type === 'portfolio') {
                data = await getPortfolios();
            } else if (type === 'news') {
                data = await getNews();
            }

            console.log(`Backend Test Success [${type}]! Data:`, data);
            setTestData(data);
            setTestStatus('success');
        } catch (error: any) {
            console.error(`Backend Test Failed [${type}]:`, error);
            setTestData(error.response?.data || error.message);
            setTestStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6">
                <LayoutDashboard className="text-emerald-400" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Dashboard</h2>
            <p className="text-slate-400 max-w-md mb-6">
                Your financial overview will appear here. Portfolio summaries, market trends, and quick actions — all in one place.
            </p>

            {/* --- BACKEND TEST SECTION --- */}
            <div className="mt-8 p-6 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700 max-w-2xl w-full">
                <h3 className="text-xl font-semibold text-white mb-6">API Integration Tests</h3>

                <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <button
                        onClick={() => handleTest('market')}
                        disabled={testStatus === 'loading'}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Test Market API
                    </button>
                    <button
                        onClick={() => handleTest('portfolio')}
                        disabled={testStatus === 'loading'}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Test Portfolio API
                    </button>
                    <button
                        onClick={() => handleTest('news')}
                        disabled={testStatus === 'loading'}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Test News API
                    </button>
                </div>

                {testStatus === 'success' && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle size={20} />
                            <span className="font-semibold">{testType.toUpperCase()} Test Successful!</span>
                        </div>
                        <p className="text-sm text-slate-300 mt-2">
                            Check Browser Console for full data structure.
                        </p>
                        <div className="mt-2 text-xs text-slate-400 text-left bg-slate-900/50 p-3 rounded w-full overflow-x-auto max-h-40">
                            <pre>{JSON.stringify(testData, null, 2)}</pre>
                        </div>
                    </div>
                )}

                {testStatus === 'error' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-red-500">
                            <XCircle size={20} />
                            <span className="font-semibold">{testType.toUpperCase()} Test Failed!</span>
                        </div>
                        <div className="mt-2 text-xs text-red-300 text-left bg-slate-900/50 p-3 rounded w-full overflow-x-auto">
                            <pre>{JSON.stringify(testData, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>

            <span className="mt-12 px-4 py-2 rounded-full bg-slate-800 text-slate-500 text-sm border border-slate-700">
                Coming Soon
            </span>
        </div>
    );
};

export default DashboardPage;
