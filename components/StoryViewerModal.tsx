
import React, { useState, useEffect, useRef } from 'react';
import type { Story, User } from '../types';
import { IconX } from './Icons';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  user: User;
}

const STORY_DURATION = 5000; // 5 seconds

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ isOpen, onClose, stories, user }) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const goToNextStory = () => {
    setCurrentStoryIndex(prevIndex => {
      if (prevIndex >= stories.length - 1) {
        onClose(); // Close modal if it's the last story
        return prevIndex;
      }
      return prevIndex + 1;
    });
  };

  const goToPreviousStory = () => {
    setCurrentStoryIndex(prevIndex => Math.max(0, prevIndex - 1));
  };

  useEffect(() => {
    if (isOpen) {
      timerRef.current = window.setTimeout(goToNextStory, STORY_DURATION);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, currentStoryIndex, stories]);


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStoryIndex(0);
    }
  }, [isOpen]);

  const handleNavigationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickPosition = clientX - left;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (clickPosition < width / 3) {
      goToPreviousStory();
    } else {
      goToNextStory();
    }
  };

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentStoryIndex];

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-lg h-full max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full p-4 z-10">
            <div className="flex items-center space-x-1">
              {stories.map((_, index) => (
                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  {index < currentStoryIndex && <div className="h-full bg-white w-full"></div>}
                  {index === currentStoryIndex && <div className="h-full bg-white animate-progress-bar"></div>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-3">
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white/50" />
                    <span className="font-bold text-white text-shadow">{user.name}</span>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white">
                    <IconX className="w-8 h-8" />
                </button>
            </div>
        </div>

        <div className="relative w-full h-full flex items-center justify-center">
            <img src={currentStory.imageUrl} alt="User story" className="w-full h-full object-contain rounded-lg select-none" />
            <div className="absolute inset-0 cursor-pointer" onClick={handleNavigationClick}></div>
        </div>
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
        .select-none {
            user-select: none;
        }
      `}</style>
    </div>
  );
};
