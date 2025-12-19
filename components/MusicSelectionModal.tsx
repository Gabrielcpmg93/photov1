
import React, { useState, useRef, useEffect } from 'react';
import type { MusicTrack } from '../types';
import { IconMusic, IconX } from './Icons';

interface MusicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track?: MusicTrack) => void;
  tracks: MusicTrack[];
}

export const MusicSelectionModal: React.FC<MusicSelectionModalProps> = ({ isOpen, onClose, onSelectTrack, tracks }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
        audioPreviewRef.current.onended = () => setPlayingTrackId(null);
      }
    } else {
      document.body.style.overflow = 'unset';
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }
      setPlayingTrackId(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handlePreview = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      audioPreviewRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = track.track_url;
        audioPreviewRef.current.play();
        setPlayingTrackId(track.id);
      }
    }
  };

  const handleSelect = (track: MusicTrack) => {
    onSelectTrack(track);
  };
  
  const handleSkip = () => {
    onSelectTrack(undefined);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">Adicionar Música</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <IconX className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
            <ul className="space-y-2">
                {tracks.map(track => (
                    <li key={track.id} className="flex items-center space-x-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <IconMusic className="w-8 h-8 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{track.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{track.artist}</p>
                        </div>
                        <button onClick={() => handlePreview(track)} className="px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white transition-colors">
                            {playingTrackId === track.id ? 'Parar' : 'Ouvir'}
                        </button>
                        <button onClick={() => handleSelect(track)} className="px-3 py-1.5 text-sm font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                            Usar
                        </button>
                    </li>
                ))}
            </ul>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
             <button
              onClick={handleSkip}
              className="w-full mt-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 rounded-lg text-white font-bold text-lg transition-colors"
            >
              Postar sem música
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
