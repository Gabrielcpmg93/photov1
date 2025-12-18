
import React from 'react';

type Participant = { id: string; name: string; avatarUrl: string; };

interface RequestToSpeakModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  user: Participant | null;
}

export const RequestToSpeakModal: React.FC<RequestToSpeakModalProps> = ({ isOpen, onAccept, onDecline, user }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all duration-300 animate-fade-in-up">
        <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-indigo-500" />
        <h3 className="text-xl font-bold text-white mb-2">Solicitação para Falar</h3>
        <p className="text-gray-300 mb-6">
          <span className="font-semibold text-indigo-300">{user.name}</span> quer subir ao palco para falar.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={onDecline}
            className="w-full px-4 py-3 text-sm font-semibold rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={onAccept}
            className="w-full px-4 py-3 text-sm font-semibold rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Aceitar
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
