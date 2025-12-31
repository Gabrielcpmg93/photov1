
import React, { useState, useEffect, useRef } from 'react';
import type { LiveSession, LiveSessionParticipant, UserProfile } from '../types';
import { IconX, IconMic, IconMicOff, IconUsers } from './Icons';
import { ListenersPanel } from './ListenersPanel';
import { RequestToSpeakModal } from './RequestToSpeakModal';
import { supabase } from '../services/supabaseService';

interface LiveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSession | null;
  currentUser: UserProfile;
}

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session: initialSession, currentUser }) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isListenersPanelOpen, setIsListenersPanelOpen] = useState(false);
  const [requestToSpeak, setRequestToSpeak] = useState<LiveSessionParticipant | null>(null);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isOpen && initialSession) {
      setSession(initialSession);
      
      const channel = supabase.channel(`live-session:${initialSession.id}`, {
          config: { broadcast: { self: false } }
      });
      channelRef.current = channel;

      channel.on('broadcast', { event: 'user-event' }, ({ payload }) => {
          console.log('Received broadcast event:', payload);
          switch (payload.type) {
            case 'user-joined':
              setSession(prev => {
                if (!prev || prev.listeners.some(l => l.id === payload.user.id) || prev.speakers.some(s => s.id === payload.user.id)) return prev;
                return { ...prev, listeners: [...prev.listeners, payload.user] };
              });
              break;
            case 'user-left':
              setSession(prev => prev ? { 
                  ...prev, 
                  listeners: prev.listeners.filter(u => u.id !== payload.user.id),
                  speakers: prev.speakers.filter(u => u.id !== payload.user.id)
              } : null);
              break;
            case 'speak-request':
              if (currentUser.id === initialSession.host.id) {
                  setRequestToSpeak(payload.user);
              }
              break;
            case 'request-accepted':
              setSession(prev => {
                if (!prev) return null;
                const user = payload.user;
                if (prev.speakers.some(s => s.id === user.id)) return prev;
                return {
                    ...prev,
                    listeners: prev.listeners.filter(u => u.id !== user.id),
                    speakers: [...prev.speakers, { ...user, isSpeaker: true }]
                };
              });
              break;
          }
      }).subscribe(status => {
          if (status === 'SUBSCRIBED') {
              if (currentUser.id !== initialSession.host.id) {
                  channel.send({
                      type: 'broadcast',
                      event: 'user-event',
                      payload: { type: 'user-joined', user: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl } }
                  });
              }
          }
      });

      return () => {
          if (channelRef.current) {
              channelRef.current.send({
                  type: 'broadcast',
                  event: 'user-event',
                  payload: { type: 'user-left', user: { id: currentUser.id } }
              });
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
          }
      };
    } else {
        setSession(null);
    }
  }, [isOpen, initialSession, currentUser]);

  const handleRequestToSpeak = () => {
      if (channelRef.current) {
          const userPayload = { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl };
          channelRef.current.send({
              type: 'broadcast',
              event: 'user-event',
              payload: { type: 'speak-request', user: userPayload }
          });
      }
  };

  const handleAcceptRequest = () => {
    if (requestToSpeak && session && channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'user-event',
            payload: { type: 'request-accepted', user: requestToSpeak }
        });

      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          speakers: [...prev.speakers, { ...requestToSpeak, isSpeaker: true }],
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
            <div>
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
                 <button onClick={handleRequestToSpeak} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold">
                    Pedir para Falar
                </button>
            )}
        </footer>
      </div>

      <ListenersPanel 
        isOpen={isListenersPanelOpen}
        onClose={() => setIsListenersPanelOpen(false)}
        listeners={session.listeners}
      />

      {isHost && (
        <RequestToSpeakModal 
            isOpen={!!requestToSpeak}
            onAccept={handleAcceptRequest}
            onDecline={() => setRequestToSpeak(null)}
            user={requestToSpeak}
        />
      )}
    </div>
  );
};
