
import React, { useRef, useEffect } from 'react';
import { IconCamera, IconMic, IconX } from './Icons';

interface ChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: () => void;
  onSelectLive: () => void;
}

export const ChoiceModal: React.FC<ChoiceModalProps> = ({ isOpen, onClose, onSelectPost, onSelectLive }) => {
  const modalRef = useRef<HTMLDivElement>(null);

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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">O que você quer criar?</h2>
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <IconX className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4">
            <button
              onClick={onSelectPost}
              className="w-full flex items-center text-left p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <IconCamera className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mr-4" />
              <div>
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Criar Postagem</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Compartilhe uma foto com seus amigos.</p>
              </div>
            </button>
            <button
              onClick={onSelectLive}
              className="w-full flex items-center text-left p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <IconMic className="w-10 h-10 text-purple-500 dark:text-purple-400 mr-4" />
              <div>
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Iniciar Live de Áudio</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transmita sua voz para outras pessoas.</p>
              </div>
            </button>
          </div>
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
