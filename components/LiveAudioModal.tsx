
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import * as db from '../services/supabaseService';
import { translateText } from '../services/geminiService';
import type { LiveSession, UserProfile, LiveComment, LiveSessionWithHost } from '../types';
import { IconX, IconSend, IconUsers, IconMic, IconMicOff, IconVolume2, IconVolumeX, IconGlobe } from './Icons';
import { LiveIndicator } from './LiveIndicator';
import { TranslationMenu } from './TranslationMenu';

type Role = 'host' | 'listener';

// Helper function to encode audio
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to decode audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface LiveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSession | LiveSessionWithHost;
  currentUser: UserProfile;
  role: Role;
}

const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 2048;

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session: initialSession, currentUser, role }) => {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [selectedComment, setSelectedComment] = useState<LiveComment | null>(null);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [isTranslating, setIsTranslating] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const channelRef = useRef<any>(null);
  const sessionStatusChannelRef = useRef<any>(null);
  const pressTimer = useRef<number | null>(null);

  const playbackStateRef = useRef(new Map<string, { queue: AudioBuffer[], isPlaying: boolean, nextStartTime: number }>());

  const host = 'host' in initialSession ? initialSession.host : currentUser;
  const isHost = role === 'host';
  
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

  const stopBroadcasting = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    sourceRef.current?.disconnect();
    scriptProcessorRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => {});
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
  }, []);

  const startBroadcasting = useCallback(async () => {
    if (mediaStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = context;
      sourceRef.current = context.createMediaStreamSource(stream);
      scriptProcessorRef.current = context.createScriptProcessor(CHUNK_SIZE, 1, 1);

      scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
        if (isMicMuted) return;
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            // Clamp the sample to the [-1, 1] range to prevent overflow/corruption.
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            // Convert to 16-bit integer.
            int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }
        const encodedChunk = encode(new Uint8Array(int16.buffer));
        channelRef.current.send({
          type: 'broadcast', event: 'audio-chunk',
          payload: { chunk: encodedChunk, senderId: currentUser.id },
        });
      };
      sourceRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(context.destination);
    } catch (err) {
      console.error("Error starting broadcast:", err);
      setError("Microfone não permitido. Verifique as permissões do navegador.");
    }
  }, [currentUser.id, isMicMuted]);
  
  const schedulePlayback = useCallback((speakerId: string) => {
    const speakerState = playbackStateRef.current.get(speakerId);
    if (!speakerState || speakerState.queue.length === 0 || !audioContextRef.current || !gainNodeRef.current) {
      if (speakerState) speakerState.isPlaying = false;
      return;
    }

    speakerState.isPlaying = true;
    const audioBuffer = speakerState.queue.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNodeRef.current);
    
    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, speakerState.nextStartTime);
    source.start(startTime);
    
    speakerState.nextStartTime = startTime + audioBuffer.duration;
    source.onended = () => schedulePlayback(speakerId);
  }, []);

  useEffect(() => {
    if (isHost) {
      startBroadcasting();
    } else {
      stopBroadcasting();
    }
  }, [isHost, startBroadcasting, stopBroadcasting]);

  useEffect(() => {
    if (!isOpen) return;

    const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    gainNodeRef.current = context.createGain();
    gainNodeRef.current.connect(context.destination);
    audioContextRef.current = context;

    const mainChannel = supabase.channel(`live-session:${initialSession.id}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = mainChannel;
    
    const statusChannel = supabase.channel(`live-session-status:${initialSession.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${initialSession.id}`
      }, (payload) => {
        if (!payload.new.is_live && !isHost) {
          alert('A live foi encerrada pelo anfitrião.');
          onClose();
        }
      }).subscribe();
    sessionStatusChannelRef.current = statusChannel;

    mainChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = mainChannel.presenceState();
        const allUsersInRoom = Object.keys(presenceState).length;
        setViewerCount(allUsersInRoom);
      })
      .on('broadcast', { event: 'audio-chunk' }, ({ payload }) => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
        
          if (!playbackStateRef.current.has(payload.senderId)) {
            playbackStateRef.current.set(payload.senderId, { queue: [], isPlaying: false, nextStartTime: 0 });
          }
          const speakerState = playbackStateRef.current.get(payload.senderId)!;
          const decodedData = decode(payload.chunk);
          const dataInt16 = new Int16Array(decodedData.buffer);
          
          if (!audioContextRef.current) return;
          const audioBuffer = audioContextRef.current.createBuffer(1, dataInt16.length, SAMPLE_RATE);
          audioBuffer.getChannelData(0).set(new Float32Array(dataInt16).map(v => v / 32768.0));

          speakerState.queue.push(audioBuffer);
          if (!speakerState.isPlaying) schedulePlayback(payload.senderId);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await mainChannel.track({ user_id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatarUrl });
        }
      });
    
    return () => {
      stopBroadcasting();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (sessionStatusChannelRef.current) supabase.removeChannel(sessionStatusChannelRef.current);
      playbackStateRef.current.clear();
      gainNodeRef.current = null;
    };
  }, [isOpen, initialSession.id, currentUser, isHost, schedulePlayback, startBroadcasting, stopBroadcasting, onClose]);
  
  // Real-time comments subscription
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialComments = async () => {
        const { data, error } = await supabase
            .from('live_comments')
            .select('*')
            .eq('session_id', initialSession.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching initial comments:', error);
        } else {
            const formattedComments: LiveComment[] = data.map(c => ({
                id: c.id,
                session_id: c.session_id,
                text: c.text,
                created_at: c.created_at,
                user: { name: c.user_name, avatarUrl: c.user_avatar_url }
            }));
            setComments(formattedComments);
        }
    };
    fetchInitialComments();

    const commentsChannel = supabase
      .channel(`live-comments:${initialSession.id}`)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `session_id=eq.${initialSession.id}`,
        },
        (payload) => {
          const newCommentData = payload.new;
          const formattedComment: LiveComment = {
            id: newCommentData.id,
            session_id: newCommentData.session_id,
            text: newCommentData.text,
            created_at: newCommentData.created_at,
            user: { name: newCommentData.user_name, avatarUrl: newCommentData.user_avatar_url }
          };
          setComments((prevComments) => [...prevComments, formattedComment]);
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [isOpen, initialSession.id]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      // The comment is inserted, and the real-time subscription will update the UI for all clients.
      await db.addLiveComment(initialSession.id, currentUser, newComment.trim());
      setNewComment('');
    }
  };

  const handlePressStart = (comment: LiveComment) => {
    pressTimer.current = window.setTimeout(() => {
      setSelectedComment(comment);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleTranslate = async (language: string) => {
    if (!selectedComment) return;
    setIsTranslating(true);
    try {
        const translatedText = await translateText(selectedComment.text, language);
        setTranslations(prev => new Map(prev).set(selectedComment.id, translatedText));
    } catch (error) {
        console.error("Translation failed:", error);
        alert('Não foi possível traduzir o comentário.');
    } finally {
        setIsTranslating(false);
        setSelectedComment(null);
    }
  };

  const handleRevertTranslation = () => {
      if (!selectedComment) return;
      setTranslations(prev => {
          const newMap = new Map(prev);
          newMap.delete(selectedComment.id);
          return newMap;
      });
      setSelectedComment(null);
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-4 transition-opacity duration-300 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 gap-4">
            <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="relative"><img src={host.avatarUrl} alt={host.name} className="w-12 h-12 rounded-full" /><div className="absolute -bottom-1 -right-1"><LiveIndicator /></div></div>
                <div><h2 className="text-xl font-bold text-white">{host.name}</h2><p className="text-gray-400">Sala de áudio</p></div>
            </div>
            {role === 'listener' && (
                <div className="flex items-center justify-center space-x-2 flex-grow min-w-0">
                    <IconVolumeX className="w-5 h-5 text-gray-400" />
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full max-w-xs h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #6366f1 ${volume * 100}%, #4b5563 ${volume * 100}%)`
                        }}
                    />
                    <IconVolume2 className="w-5 h-5 text-gray-400" />
                </div>
            )}
             <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full"><IconUsers className="w-5 h-5 text-white" /><span className="text-white font-semibold">{viewerCount}</span></div>
                <button onClick={onClose} className="text-gray-300 hover:text-white bg-black/30 p-2 rounded-full"><IconX className="w-6 h-6" /></button>
            </div>
        </div>

        {/* Host Stage */}
        <div className="flex flex-col items-center justify-center rounded-2xl p-6 bg-black/30 min-h-[200px]">
            <div className="relative">
                <img src={host.avatarUrl} alt={host.name} className="w-32 h-32 rounded-full border-4 border-indigo-500 shadow-lg" />
                {isHost && (
                    <button onClick={() => setIsMicMuted(m => !m)} className="absolute bottom-0 right-0 bg-gray-700 text-white rounded-full p-3 border-2 border-gray-900">
                        {isMicMuted ? <IconMicOff className="w-6 h-6" /> : <IconMic className="w-6 h-6"/>}
                    </button>
                )}
            </div>
            <p className="mt-4 text-white text-xl font-bold">{host.name}</p>
            <p className="text-gray-400">Anfitrião</p>
        </div>
        
        {/* Comments */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
             <div className="flex-1 bg-black/30 rounded-t-2xl p-4 overflow-y-auto space-y-3">
                 {comments.map(c => {
                    const isTranslated = translations.has(c.id);
                    return (
                        <div 
                            key={c.id} 
                            onMouseDown={() => handlePressStart(c)}
                            onMouseUp={handlePressEnd}
                            onTouchStart={() => handlePressStart(c)}
                            onTouchEnd={handlePressEnd}
                            className="flex items-start animate-fade-in-up cursor-pointer"
                        >
                            <img src={c.user.avatarUrl} alt={c.user.name} className="w-8 h-8 rounded-full mr-3" />
                            <div>
                                <p className="font-semibold text-indigo-300 text-sm">{c.user.name}</p>
                                <p className="text-white flex items-center">
                                    {isTranslated ? translations.get(c.id) : c.text}
                                    {isTranslated && (
                                        <button onClick={() => setSelectedComment(c)} className="ml-2 text-gray-400 hover:text-white">
                                            <IconGlobe className="w-4 h-4" />
                                        </button>
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                 })}
                 <div ref={commentsEndRef}></div>
            </div>
            <form onSubmit={handleCommentSubmit} className="bg-black/50 rounded-b-2xl p-4 flex items-center space-x-3"><img src={currentUser.avatarUrl} alt="Você" className="w-9 h-9 rounded-full" /><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Envie um comentário..." className="w-full bg-gray-800 text-white border-transparent rounded-full py-2 px-4 focus:ring-2 focus:ring-indigo-500" /><button type="submit" className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors disabled:bg-gray-700"><IconSend className="w-5 h-5"/></button></form>
        </div>
      </div>
      
      {selectedComment && (
        <TranslationMenu
            isTranslating={isTranslating}
            hasTranslation={translations.has(selectedComment.id)}
            onTranslate={handleTranslate}
            onRevert={handleRevertTranslation}
            onClose={() => setSelectedComment(null)}
        />
      )}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}.animate-fade-in{animation:fadeIn .3s ease-out forwards}@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in-up{animation:fadeInUp .5s ease-out forwards}`}</style>
    </div>
  );
};
