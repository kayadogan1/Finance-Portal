import { Newspaper } from 'lucide-react';

const NewsPage = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6">
                <Newspaper className="text-emerald-400" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Financial News</h2>
            <p className="text-slate-400 max-w-md">
                Stay up-to-date with the latest market news, analysis, and financial headlines from around the world.
            </p>
            <span className="mt-6 px-4 py-2 rounded-full bg-slate-800 text-slate-500 text-sm border border-slate-700">
                Coming Soon
            </span>
        </div>
    );
};

export default NewsPage;
