
import React from 'react';
import type { Post } from '../types';
import { IconHeart, IconMessageCircle, IconTrendingUp } from './Icons';

interface PerformanceDashboardProps {
  posts: Post[];
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-white/5 p-4 rounded-lg flex items-center space-x-3">
        <div className="text-indigo-400">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const LineChart: React.FC<{ data: number[] }> = ({ data }) => {
    if (data.length < 2) {
        return <div className="w-full h-48 bg-white/5 p-4 rounded-lg flex items-center justify-center text-gray-500">Dados insuficientes para o gráfico.</div>;
    }
    const width = 300;
    const height = 150;
    const maxVal = Math.max(...data, 1);
    const points = data.map((val, i) => `${(i / (data.length - 1)) * width},${height - (val / maxVal) * height}`).join(' ');
    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" preserveAspectRatio="none">
            <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                points={points}
            />
            <polygon fill="url(#areaGradient)" points={areaPoints} />
        </svg>
    );
};


export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ posts }) => {
    if (posts.length === 0) {
        return <div className="text-center text-gray-500">Poste algo para ver seu desempenho.</div>;
    }

    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
    const avgLikes = (totalLikes / posts.length).toFixed(1);

    const topPost = [...posts].sort((a, b) => b.likes - a.likes)[0];

    const chartData = posts
        .slice(0, 10)
        .reverse()
        .map(post => post.likes);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<IconHeart className="w-6 h-6" />} label="Likes Totais" value={totalLikes} />
                <StatCard icon={<IconMessageCircle className="w-6 h-6" />} label="Comentários Totais" value={totalComments} />
            </div>
             <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><IconTrendingUp className="w-5 h-5 mr-2 text-green-400" /> Tendência de Likes</h3>
                <div className="bg-white/5 p-2 rounded-lg">
                    <LineChart data={chartData} />
                </div>
            </div>
            {topPost && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Postagem de Melhor Desempenho</h3>
                    <div className="bg-white/5 rounded-lg flex items-center p-3 space-x-4">
                        <img src={topPost.imageUrl} alt={topPost.caption} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                        <div className="overflow-hidden">
                            <p className="text-sm text-gray-300 truncate">{topPost.caption}</p>
                            <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1.5 text-red-400">
                                    <IconHeart className="w-5 h-5" />
                                    <span className="font-bold">{topPost.likes}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 text-blue-400">
                                    <IconMessageCircle className="w-5 h-5" />
                                    <span className="font-bold">{topPost.comments}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
