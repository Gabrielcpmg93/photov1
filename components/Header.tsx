
import React from 'react';
import { IconCamera, IconPlus, IconUser } from './Icons';

interface HeaderProps {
  onNewPostClick: () => void;
  onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPostClick, onProfileClick }) => {
  return (
    <header className="sticky top-0 z-20 bg-white/10 dark:bg-gray-900/50 backdrop-blur-xl border-b border-white/10 dark:border-gray-500/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <IconCamera className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tighter text-gray-800 dark:text-gray-100">PhotoGrid AI</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onNewPostClick}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-white font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transform hover:scale-105"
            >
              <IconPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Criar</span>
            </button>
            <button
              onClick={onProfileClick}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
              aria-label="Ver perfil"
            >
              <IconUser className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};