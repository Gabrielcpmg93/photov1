
import React, { useState, useRef, useEffect } from 'react';
import { IconX, IconCamera, IconMic } from './Icons';

interface ChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: () => void;
  onSelectLive: (title: string) => void;
}

export const ChoiceModal: React.FC<ChoiceModalProps> = ({ isOpen, onClose, onSelectPost, onSelectLive }) => {
  const [showLiveForm, setShowLiveForm] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setShowLiveForm(false);
      setLiveTitle('');
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleLiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveTitle.trim()) {
      onSelectLive(liveTitle.trim());
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
        className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <IconX className="w-6 h-6" />
          </button>
          
          {showLiveForm ? (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-center">Sua Sala Ao Vivo</h2>
              <form onSubmit={handleLiveSubmit}>
                <input
                  type="text"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="Qual o tema da conversa?"
                  className="w-full bg-white/5 text-white border border-white/10 rounded-lg py-2 px-4 focus:ring-2 focus:ring-indigo-500 transition-colors placeholder-gray-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!liveTitle.trim()}
                  className="w-full mt-4 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Iniciar
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6">O que você quer criar?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={onSelectPost}
                  className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <IconCamera className="w-12 h-12 text-indigo-400 mb-2" />
                  <span className="font-semibold">Postagem</span>
                </button>
                <button
                  onClick={() => setShowLiveForm(true)}
                  className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <IconMic className="w-12 h-12 text-purple-400 mb-2" />
                  <span className="font-semibold">Sala Ao Vivo</span>
                </button>
              </div>
            </div>
          )}
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