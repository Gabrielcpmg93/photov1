
import React, { useEffect, useState } from 'react';

type Participant = { id: string; name: string; avatarUrl: string; };

interface InvitationToastProps {
  inviter: Participant;
  onAccept: () => void;
  onDecline: () => void;
}

export const InvitationToast: React.FC<InvitationToastProps> = ({ inviter, onAccept, onDecline }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDecline = () => {
    setIsVisible(false);
    // Wait for animation to finish before calling parent handler
    setTimeout(onDecline, 300);
  };
  
  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onAccept, 300);
  };

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md p-4 transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-gray-700 rounded-2xl shadow-lg flex items-center p-3 space-x-3 border border-gray-600">
        <img src={inviter.avatarUrl} alt={inviter.name} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <p className="text-white font-semibold">{inviter.name}</p>
          <p className="text-sm text-gray-300">convidou você para falar.</p>
        </div>
        <div className="flex space-x-2">
            <button onClick={handleDecline} className="px-4 py-2 text-sm font-semibold rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors">
              Recusar
            </button>
            <button onClick={handleAccept} className="px-4 py-2 text-sm font-semibold rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              Aceitar
            </button>
        </div>
      </div>
    </div>
  );
};
