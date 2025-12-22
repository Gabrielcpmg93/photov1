
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface TranslationMenuProps {
  onTranslate: (language: string) => void;
  onRevert: () => void;
  onClose: () => void;
  isTranslating: boolean;
  hasTranslation: boolean;
}

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
];

export const TranslationMenu: React.FC<TranslationMenuProps> = ({ onTranslate, onRevert, onClose, isTranslating, hasTranslation }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs p-4 transform transition-all duration-300 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {isTranslating ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-white mt-4">Traduzindo...</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4 text-center">Traduzir Comentário</h3>
            <div className="flex flex-col space-y-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => onTranslate(lang.name)}
                  className="w-full text-left p-3 bg-gray-700 hover:bg-indigo-600 rounded-lg text-white font-semibold transition-colors"
                >
                  {lang.name}
                </button>
              ))}
              {hasTranslation && (
                 <button
                    onClick={onRevert}
                    className="w-full text-left p-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors mt-2"
                  >
                   Mostrar Original
                 </button>
              )}
            </div>
            <button onClick={onClose} className="mt-4 w-full text-center p-2 text-gray-400 hover:text-white rounded-lg transition-colors hover:bg-gray-700/50">Cancelar</button>
          </>
        )}
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
