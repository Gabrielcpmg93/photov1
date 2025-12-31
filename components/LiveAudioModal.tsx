
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveSession, LiveSessionParticipant, UserProfile, FloatingHeart, ChatMessage } from '../types';
import { IconX, IconMic, IconMicOff, IconUsers, IconShare, IconHeart } from './Icons';
import { ListenersPanel } from './ListenersPanel';
import { RequestToSpeakModal } from './RequestToSpeakModal';
import { supabase } from '../services/supabaseService';
import { ChatBox } from './ChatBox';
import { FloatingHeartComponent } from './FloatingHeart';

interface LiveAudioModalProps {
  isOpen: boolean;
  onClose: (sessionId: string) => void;
  session: LiveSession | null;
  currentUser: UserProfile;
}

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session: initialSession, currentUser }) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isListenersPanelOpen, setIsListenersPanelOpen] = useState(false);
  const [requestToSpeak, setRequestToSpeak] = useState<LiveSessionParticipant | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [isMuted, setIsMuted] = useState(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleClose = () => {
    if (initialSession) {
      onClose(initialSession.id);
    }
  };

  useEffect(() => {
    if (isOpen && initialSession) {
      setSession(initialSession);
      
      const channel = supabase.channel(`live-session:${initialSession.id}`, {
          config: { broadcast: { self: false } }
      });
      channelRef.current = channel;

      channel.on('broadcast', { event: 'user-event' }, ({ payload }) => {
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
                    speakers: [...prev.speakers, { ...user, isSpeaker: true, isMuted: true }]
                };
              });
              break;
             case 'like-sent':
                setSession(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
                setFloatingHearts(hearts => [...hearts, { id: Date.now(), x: payload.x, y: payload.y }]);
                break;
            case 'chat-message-sent':
                setSession(prev => prev ? { ...prev, chat: [...(prev.chat || []), payload.message] } : null);
                break;
            case 'host-mic-toggled':
                setSession(prev => {
                    if (!prev) return null;
                    const host = prev.speakers.find(s => s.isHost);
                    if (host) host.isMuted = payload.isMuted;
                    return { ...prev };
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
          speakers: [...prev.speakers, { ...requestToSpeak, isSpeaker: true, isMuted: true }],
          listeners: prev.listeners.filter(l => l.id !== requestToSpeak.id),
        };
      });
    }
    setRequestToSpeak(null);
  };
  
  const handleTapToLike = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setFloatingHearts(hearts => [...hearts, { id: Date.now(), x, y }]);
      setSession(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);

      if(channelRef.current) {
          channelRef.current.send({
              type: 'broadcast',
              event: 'user-event',
              payload: { type: 'like-sent', x, y }
          });
      }
  };

  const onHeartAnimationEnd = (id: number) => {
      setFloatingHearts(hearts => hearts.filter(h => h.id !== id));
  };
  
  const handleSendMessage = (text: string) => {
    if (channelRef.current) {
      const message: ChatMessage = {
        id: `msg_${Date.now()}`,
        user: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
        text: text
      };
      setSession(prev => prev ? { ...prev, chat: [...(prev.chat || []), message] } : null);
      channelRef.current.send({
        type: 'broadcast',
        event: 'user-event',
        payload: { type: 'chat-message-sent', message }
      });
    }
  };
  
  const toggleMute = useCallback(() => {
    if (!session || currentUser.id !== session.host.id) return;
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'user-event',
            payload: { type: 'host-mic-toggled', isMuted: newMutedState }
        });
    }
  }, [isMuted, session, currentUser.id]);

  const handleShare = () => {
    const text = encodeURIComponent(`Junte-se a mim na sala de áudio de ${session?.host.name}: "${session?.title}"`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen || !session) return null;

  const isHost = currentUser.id === session.host.id;
  const isSpeaker = session.speakers.some(s => s.id === currentUser.id);
  const hostMicState = session.speakers.find(s => s.isHost)?.isMuted ?? true;

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-gray-900 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-700 flex items-center justify-between z-10">
            <div>
                <h2 className="text-xl font-bold text-white">{session.title}</h2>
                <p className="text-sm text-gray-400">com {session.host.name}</p>
            </div>
            <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 p-2 bg-black/20 rounded-lg">
                    <IconHeart className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-white">{session.likes || 0}</span>
                </div>
                 <button onClick={handleShare} className="p-2 text-gray-300 hover:text-white hover:bg-black/20 rounded-lg">
                    <IconShare className="w-6 h-6" />
                </button>
                <button onClick={() => setIsListenersPanelOpen(true)} className="flex items-center space-x-2 text-gray-300 hover:text-white p-2 hover:bg-black/20 rounded-lg">
                    <IconUsers className="w-6 h-6" />
                    <span className="font-semibold">{session.speakers.length + session.listeners.length}</span>
                </button>
                <button onClick={handleClose} className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 rounded-lg text-white">
                    {isHost ? 'Encerrar' : 'Sair'}
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative" onClick={handleTapToLike}>
            {floatingHearts.map(heart => (
                <FloatingHeartComponent key={heart.id} x={heart.x} y={heart.y} onEnd={() => onHeartAnimationEnd(heart.id)} />
            ))}
            <div>
                <h3 className="text-gray-400 font-semibold mb-3">PALESTRANTES</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {session.speakers.map(speaker => (
                        <div key={speaker.id} className="flex flex-col items-center text-center">
                            <div className="relative">
                                <img src={speaker.avatarUrl} alt={speaker.name} className="w-24 h-24 rounded-full border-4 border-indigo-500" />
                                <div className="absolute -bottom-2 -right-2 bg-gray-700 p-2 rounded-full">
                                    {(speaker.isHost ? hostMicState : speaker.isMuted) ? <IconMicOff className="w-5 h-5 text-red-400" /> : <IconMic className="w-5 h-5 text-white" />}
                                </div>
                            </div>
                            <p className="mt-2 font-semibold text-white truncate w-full">{speaker.name}</p>
                            {speaker.isHost && <p className="text-xs text-indigo-400">Anfitrião</p>}
                        </div>
                    ))}
                </div>
            </div>
        </main>

        <ChatBox messages={session.chat || []} onSendMessage={handleSendMessage} currentUser={currentUser} />

        <footer className="p-4 bg-gray-800/50 border-t border-gray-700 z-10">
            {isSpeaker && (
                <div className="flex items-center justify-center">
                    <button onClick={isHost ? toggleMute : undefined} className={`p-4 rounded-full text-white transition-colors ${isHost ? 'hover:bg-gray-600' : 'cursor-default'} ${!isMuted ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                         {isMuted ? <IconMicOff className="w-6 h-6" /> : <IconMic className="w-6 h-6" />}
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
