
import React from 'react';
import type { LiveSession } from '../types';
import { LiveIndicator } from './LiveIndicator';

interface LiveSessionsBarProps {
  sessions: LiveSession[];
  onJoinSession: (session: LiveSession) => void;
}

export const LiveSessionsBar: React.FC<LiveSessionsBarProps> = ({ sessions, onJoinSession }) => {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-300 mb-3 flex items-center">
        <LiveIndicator />
        <span className="ml-2">Ao Vivo Agora</span>
      </h2>
      <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onJoinSession(session)}
            className="flex-shrink-0 w-64 bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-700/70 transition-colors"
          >
            <p className="font-bold text-white truncate">{session.title}</p>
            <div className="flex items-center mt-3">
              <img src={session.host.avatarUrl} alt={session.host.name} className="w-8 h-8 rounded-full" />
              <div className="ml-2">
                <p className="text-sm font-semibold text-gray-200">{session.host.name}</p>
                <p className="text-xs text-gray-400">Anfitrião</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
