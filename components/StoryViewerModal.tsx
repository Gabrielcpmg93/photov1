
import React, { useEffect, useRef } from 'react';
import type { User } from '../types';
import { IconX } from './Icons';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyUrl: string | null | undefined;
  user: User;
}

const STORY_DURATION = 5000; // 5 seconds

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ isOpen, onClose, storyUrl, user }) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      timerRef.current = window.setTimeout(() => {
        onClose();
      }, STORY_DURATION);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, onClose]);
  
  if (!isOpen || !storyUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-lg h-full max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full p-4 z-10">
            <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white animate-progress-bar"></div>
            </div>
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center">
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-3 border-2 border-white/50" />
                    <span className="font-bold text-white text-shadow">{user.name}</span>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white">
                    <IconX className="w-8 h-8" />
                </button>
            </div>
        </div>

        <img src={storyUrl} alt="User story" className="w-full h-full object-contain rounded-lg" />
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-bar {
          animation: progressBar ${STORY_DURATION / 1000}s linear forwards;
        }
        .text-shadow {
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};
