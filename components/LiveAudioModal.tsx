
import React, { useState, useEffect } from 'react';
import type { LiveSession, LiveSessionParticipant, UserProfile } from '../types';
import { IconX, IconMic, IconMicOff, IconUsers, IconSend } from './Icons';
import { ListenersPanel } from './ListenersPanel';
import { RequestToSpeakModal } from './RequestToSpeakModal';
import { InvitationToast } from './InvitationToast';

interface LiveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSession | null;
  currentUser: UserProfile;
}

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session: initialSession, currentUser }) => {
  const [session, setSession] = useState<LiveSession | null>(initialSession);
  const [isListenersPanelOpen, setIsListenersPanelOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [requestToSpeak, setRequestToSpeak] = useState<LiveSessionParticipant | null>(null);
  const [showInvitationToast, setShowInvitationToast] = useState<LiveSessionParticipant | null>(null);

  useEffect(() => {
    setSession(initialSession);
    if (isOpen) {
      // Mock receiving a request to speak after 5s
      const requestTimer = setTimeout(() => {
        if (initialSession && initialSession.listeners.length > 0) {
            setRequestToSpeak(initialSession.listeners[0]);
        }
      }, 5000);
      
      // Mock receiving an invitation to speak from another user
      const inviteTimer = setTimeout(() => {
         setShowInvitationToast({ id: 'inviter_1', name: 'Julia', avatarUrl: 'https://i.pravatar.cc/150?u=julia' });
      }, 10000);

      return () => {
        clearTimeout(requestTimer);
        clearTimeout(inviteTimer);
      };

    }
  }, [isOpen, initialSession]);

  const handleInvite = (user: LiveSessionParticipant) => {
    setInvitedIds(prev => new Set(prev).add(user.id));
    // Here you would send a notification/event to the user
    console.log(`Invited ${user.name} to speak.`);
  };

  const handleAcceptRequest = () => {
    if (requestToSpeak && session) {
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          speakers: [...prev.speakers, requestToSpeak],
          listeners: prev.listeners.filter(l => l.id !== requestToSpeak.id),
        };
      });
    }
    setRequestToSpeak(null);
  };
  
  if (!isOpen || !session) return null;

  const isHost = currentUser.id === session.host.id;
  const isSpeaker = session.speakers.some(s => s.id === currentUser.id);

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold text-white">{session.title}</h2>
                <p className="text-sm text-gray-400">com {session.host.name}</p>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={() => setIsListenersPanelOpen(true)} className="flex items-center space-x-2 text-gray-300 hover:text-white">
                    <IconUsers className="w-6 h-6" />
                    <span className="font-semibold">{session.speakers.length + session.listeners.length}</span>
                </button>
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 rounded-lg text-white">
                    {isHost ? 'Encerrar' : 'Sair'}
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
            {/* Speakers */}
            <div className="mb-8">
                <h3 className="text-gray-400 font-semibold mb-3">PALESTRANTES</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {session.speakers.map(speaker => (
                        <div key={speaker.id} className="flex flex-col items-center text-center">
                            <div className="relative">
                                <img src={speaker.avatarUrl} alt={speaker.name} className="w-24 h-24 rounded-full border-4 border-indigo-500" />
                                <div className="absolute -bottom-2 -right-2 bg-gray-700 p-2 rounded-full">
                                    {speaker.isMuted ? <IconMicOff className="w-5 h-5 text-red-400" /> : <IconMic className="w-5 h-5 text-white" />}
                                </div>
                            </div>
                            <p className="mt-2 font-semibold text-white truncate w-full">{speaker.name}</p>
                            {speaker.isHost && <p className="text-xs text-indigo-400">Anfitrião</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Listeners */}
            <div>
                <h3 className="text-gray-400 font-semibold mb-3">OUVINTES</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {session.listeners.map(listener => (
                         <div key={listener.id} className="flex flex-col items-center text-center">
                            <img src={listener.avatarUrl} alt={listener.name} className="w-16 h-16 rounded-full" />
                            <p className="mt-1 text-sm text-gray-300 truncate w-full">{listener.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </main>

        <footer className="p-4 bg-gray-800/50 border-t border-gray-700">
            {isSpeaker && (
                <div className="flex items-center justify-center">
                    <button className="p-4 bg-gray-700 rounded-full text-white hover:bg-gray-600">
                        <IconMic className="w-6 h-6" />
                    </button>
                </div>
            )}
            {!isSpeaker && (
                 <button onClick={() => setRequestToSpeak(currentUser)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold">
                    Pedir para Falar
                </button>
            )}
        </footer>
      </div>

      <ListenersPanel 
        isOpen={isListenersPanelOpen}
        onClose={() => setIsListenersPanelOpen(false)}
        listeners={session.listeners}
        invitedIds={invitedIds}
        onInvite={handleInvite}
        canInvite={isHost}
      />

      {isHost && (
        <RequestToSpeakModal 
            isOpen={!!requestToSpeak}
            onAccept={handleAcceptRequest}
            onDecline={() => setRequestToSpeak(null)}
            user={requestToSpeak}
        />
      )}
      
      {showInvitationToast && (
          <InvitationToast 
            inviter={showInvitationToast}
            onAccept={() => { console.log('Accepted invite'); setShowInvitationToast(null); }}
            onDecline={() => setShowInvitationToast(null)}
          />
      )}
    </div>
  );
};
