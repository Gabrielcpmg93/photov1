
import React from 'react';
import { IconCamera, IconPlus, IconUser } from './Icons';

interface HeaderProps {
  onNewPostClick: () => void;
  onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPostClick, onProfileClick }) => {
  return (
    <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <IconCamera className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tighter text-gray-100">PhotoGrid AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onNewPostClick}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-semibold transition-colors duration-300 shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              <IconPlus className="w-5 h-5" />
              <span>Nova Postagem</span>
            </button>
            <button
              onClick={onProfileClick}
              className="p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
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
