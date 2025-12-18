
import React from 'react';

export const LiveIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1.5 bg-red-600 px-2 py-0.5 rounded-full text-white font-bold text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <span>AO VIVO</span>
    </div>
  );
};
