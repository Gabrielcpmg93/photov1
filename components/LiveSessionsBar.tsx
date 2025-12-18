
import React from 'react';
import type { LiveSessionWithHost } from '../types';
import { LiveIndicator } from './LiveIndicator';

interface LiveSessionsBarProps {
  sessions: LiveSessionWithHost[];
  onJoinLive: (session: LiveSessionWithHost) => void;
}

export const LiveSessionsBar: React.FC<LiveSessionsBarProps> = ({ sessions, onJoinLive }) => {
  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
      {sessions.map(session => (
        <button 
          key={session.id}
          onClick={() => onJoinLive(session)}
          className="flex-shrink-0 flex flex-col items-center space-y-2 group focus:outline-none"
        >
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-red-500 to-purple-500 group-hover:scale-105 transition-transform duration-300"></div>
            <img 
              src={session.host.avatarUrl} 
              alt={session.host.name} 
              className="relative w-20 h-20 rounded-full border-4 border-white dark:border-gray-800" 
            />
            <div className="absolute bottom-0 -right-2">
                <LiveIndicator />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
            {session.host.name}
          </p>
        </button>
      ))}
       <style>{`
        /* Custom scrollbar for webkit browsers */
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background-color: rgba(129, 140, 248, 0.5); /* indigo-400 with opacity */
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
