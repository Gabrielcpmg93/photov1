
import React, { useEffect } from 'react';
import { IconHeart } from './Icons';

interface FloatingHeartProps {
  x: number;
  y: number;
  onEnd: () => void;
}

export const FloatingHeartComponent: React.FC<FloatingHeartProps> = ({ x, y, onEnd }) => {
  useEffect(() => {
    const timer = setTimeout(onEnd, 1000); // Animation duration is 1s
    return () => clearTimeout(timer);
  }, [onEnd]);

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        <IconHeart className="w-8 h-8 text-red-500 animate-float" fill="currentColor" />
      </div>
      <style>{`
        @keyframes float {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -150px) scale(0.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 1s ease-out forwards;
        }
      `}</style>
    </>
  );
};
