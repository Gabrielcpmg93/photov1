
import React from 'react';
import type { Post } from '../types';
import { IconHeart, IconMessageCircle, IconTrendingUp } from './Icons';

interface PerformanceDashboardProps {
  posts: Post[];
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-white/5 p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    return (
        <div className="w-full h-48 bg-white/5 p-4 rounded-lg flex items-end justify-around space-x-2">
            {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div 
                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${(item.value / maxValue) * 100}%` }}
                        title={`${item.label}: ${item.value} likes`}
                    />
                    <span className="text-xs text-gray-400 mt-1 truncate">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ posts }) => {
    if (posts.length === 0) {
        return <div className="text-center text-gray-500">Poste algo para ver seu desempenho.</div>;
    }

    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
    const avgLikes = (totalLikes / posts.length).toFixed(1);
    const avgComments = (totalComments / posts.length).toFixed(1);

    const chartData = posts
        .slice(0, 7)
        .reverse()
        .map((post, i) => ({ label: `Post #${posts.length - i}`, value: post.likes }));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<IconHeart className="w-6 h-6 text-red-400" />} label="Likes Totais" value={totalLikes} />
                <StatCard icon={<IconMessageCircle className="w-6 h-6 text-blue-400" />} label="Comentários Totais" value={totalComments} />
                <StatCard icon={<IconHeart className="w-6 h-6 text-red-300" />} label="Média de Likes" value={avgLikes} />
                <StatCard icon={<IconMessageCircle className="w-6 h-6 text-blue-300" />} label="Média de Comentários" value={avgComments} />
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><IconTrendingUp className="w-5 h-5 mr-2 text-green-400" /> Desempenho dos Últimos Posts</h3>
                <BarChart data={chartData} />
            </div>
        </div>
    );
};
