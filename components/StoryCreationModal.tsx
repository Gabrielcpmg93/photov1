
import React, { useState, useEffect, useRef } from 'react';
import type { MusicTrack } from '../types';
import { IconX, IconMusic } from './Icons';

interface StoryCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  selectedTrack: MusicTrack | null;
  onOpenMusicSelector: () => void;
  onPost: () => void;
}

export const StoryCreationModal: React.FC<StoryCreationModalProps> = ({
  isOpen,
  onClose,
  file,
  selectedTrack,
  onOpenMusicSelector,
  onPost,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);
  
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset' };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-black rounded-2xl shadow-2xl w-full max-w-lg h-full max-h-[90vh] flex flex-col transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-4 flex justify-end">
             <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-10">
                <IconX className="w-6 h-6" />
             </button>
        </div>
        <div className="flex-1 relative flex items-center justify-center min-h-0">
            {previewUrl ? (
                <img src={previewUrl} alt="Pré-visualização do Story" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
                <div className="text-gray-500">Nenhum arquivo selecionado.</div>
            )}
        </div>
        <div className="p-6 space-y-4">
            {selectedTrack ? (
                 <div className="bg-white/10 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-white">
                        <IconMusic className="w-5 h-5" />
                        <div>
                            <p className="font-semibold text-sm">{selectedTrack.title}</p>
                            <p className="text-xs text-gray-300">{selectedTrack.artist}</p>
                        </div>
                    </div>
                    <button onClick={onOpenMusicSelector} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                        Mudar
                    </button>
                 </div>
            ) : (
                <button onClick={onOpenMusicSelector} className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors flex items-center justify-center space-x-2">
                    <IconMusic className="w-5 h-5" />
                    <span>Adicionar Música</span>
                </button>
            )}

            <button
                onClick={onPost}
                disabled={!selectedTrack}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Postar Story
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
