
import React from 'react';

export const LiveIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full text-white font-bold text-sm">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      <span>AO VIVO</span>
    </div>
  );
};
