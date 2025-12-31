
import React, { useRef } from 'react';
import { IconX, IconUser } from './Icons';

type Participant = { id: string; name: string; avatarUrl: string; };

interface ListenersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listeners: Participant[];
}

export const ListenersPanel: React.FC<ListenersPanelProps> = ({ isOpen, onClose, listeners }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return (
    <div className="fixed inset-0 z-50 transition-opacity duration-300 opacity-0 pointer-events-none" />
  );

  return (
    <div className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleOverlayClick}>
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Ouvintes ({listeners.length})</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700">
            <IconX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
            {listeners.length > 0 ? (
                <ul className="space-y-1">
                    {listeners.map(user => (
                        <li key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                                <span className="text-white font-medium">{user.name}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <IconUser className="w-12 h-12 mb-2" />
                    <p>Nenhum ouvinte na sala.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
