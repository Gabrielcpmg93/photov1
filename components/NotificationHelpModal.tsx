
import React, { useRef, useEffect } from 'react';
import { IconX, IconLock } from './Icons';

interface NotificationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationHelpModal: React.FC<NotificationHelpModalProps> = ({ isOpen, onClose }) => {
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ativar Notificações</h2>
             <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <IconX className="w-6 h-6" />
             </button>
          </div>
          
          <div className="text-gray-600 dark:text-gray-300 space-y-4">
            <p>Parece que as notificações estão bloqueadas no seu navegador. Siga estes passos para ativá-las:</p>
            <ol className="list-decimal list-inside space-y-3 bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                <li>Clique no ícone de <IconLock className="inline-block w-4 h-4 -mt-1 mx-1" /> <strong>cadeado</strong> ao lado do endereço do site na barra de navegação.</li>
                <li>Encontre a opção <strong>Notificações</strong> na lista.</li>
                <li>Altere a permissão de "Bloquear" para <strong>"Permitir"</strong>.</li>
                <li>Recarregue a página para aplicar as alterações.</li>
            </ol>
            <p>Após seguir estes passos, você poderá ativar as notificações push nas configurações do aplicativo.</p>
          </div>

          <div className="mt-6 text-center">
            <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors">
              Entendi
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
