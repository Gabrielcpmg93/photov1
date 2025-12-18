
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseService';
import * as db from '../services/supabaseService';
import type { LiveSession, UserProfile, LiveComment, User, LiveSessionWithHost } from '../types';
import { IconX, IconSend, IconUsers, IconVolume2, IconVolumeX } from './Icons';
import { LiveIndicator } from './LiveIndicator';

// Helper functions for audio processing
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
  role: 'host' | 'listener';
}

const SAMPLE_RATE = 16000;
// Reduced chunk size for lower latency. This sends smaller packets more frequently.
const CHUNK_SIZE = 2048;

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session, currentUser, role }) => {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const channelRef = useRef<any>(null);

  const host = 'host' in session ? session.host : currentUser;

  useEffect(() => {
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase.channel(`live-session:${session.id}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel.on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_comments',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        const newCommentPayload = payload.new;
        const formattedComment: LiveComment = {
            id: newCommentPayload.id,
            session_id: newCommentPayload.session_id,
            text: newCommentPayload.text,
            created_at: newCommentPayload.created_at,
            user: { name: newCommentPayload.user_name, avatarUrl: newCommentPayload.user_avatar_url }
        }
        setComments(prev => [...prev, formattedComment]);
      });

    channel.on('presence', { event: 'sync' }, () => {
      setViewerCount(Object.keys(channel.presenceState()).length);
    });

    if (role === 'listener') {
      channel.on('broadcast', { event: 'audioChunk' }, ({ payload }) => {
        const decodedData = decode(payload.chunk);
        const dataInt16 = new Int16Array(decodedData.buffer);
        
        if (!audioContextRef.current) return;
        const frameCount = dataInt16.length;
        const audioBuffer = audioContextRef.current.createBuffer(1, frameCount, SAMPLE_RATE);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }
        playbackQueueRef.current.push(audioBuffer);
        if (!isPlayingRef.current) {
            schedulePlayback();
        }
      });
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
        setIsLive(true);
        if (role === 'host') {
          startBroadcasting();
        } else {
          setupPlayback();
        }
      }
    });
    
    const startBroadcasting = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = context;
        sourceRef.current = context.createMediaStreamSource(stream);
        scriptProcessorRef.current = context.createScriptProcessor(CHUNK_SIZE, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const l = inputData.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) {
            int16[i] = inputData[i] * 32768;
          }
          const encodedChunk = encode(new Uint8Array(int16.buffer));
          channel.send({
            type: 'broadcast',
            event: 'audioChunk',
            payload: { chunk: encodedChunk },
          });
        };
        
        sourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(context.destination);

      } catch (err) {
        console.error("Error starting broadcast:", err);
        setError("Não foi possível iniciar a live. Verifique as permissões do microfone.");
        setIsLive(false);
      }
    };

    const setupPlayback = () => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        gainNodeRef.current = context.createGain();
        gainNodeRef.current.gain.value = volume;
        gainNodeRef.current.connect(context.destination);
        audioContextRef.current = context;
        nextStartTimeRef.current = 0;
    };

    const schedulePlayback = () => {
        if (playbackQueueRef.current.length === 0 || !audioContextRef.current || !gainNodeRef.current) {
            isPlayingRef.current = false;
            return;
        }
        isPlayingRef.current = true;
        const audioBuffer = playbackQueueRef.current.shift()!;
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNodeRef.current);
        
        const currentTime = audioContextRef.current.currentTime;
        const startTime = Math.max(currentTime, nextStartTimeRef.current);
        source.start(startTime);
        
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        source.onended = schedulePlayback;
    };

    return () => {
      if(channelRef.current) supabase.removeChannel(channelRef.current);
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      sourceRef.current?.disconnect();
      scriptProcessorRef.current?.disconnect();
      audioContextRef.current?.close();
      setIsLive(false);
      isPlayingRef.current = false;
      playbackQueueRef.current = [];
    };
  }, [isOpen, session.id, currentUser.id, role]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      await db.addLiveComment(session.id, currentUser, newComment.trim());
      setNewComment('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-4 transition-opacity duration-300 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
                <img src={host.avatarUrl} alt={host.name} className="w-12 h-12 rounded-full border-2 border-indigo-500" />
                <div>
                    <h2 className="text-xl font-bold text-white">{host.name}</h2>
                    <p className="text-gray-400">Está ao vivo agora!</p>
                </div>
            </div>
             <div className="flex items-center space-x-4">
                <LiveIndicator />
                <div className="flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full">
                    <IconUsers className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">{viewerCount}</span>
                </div>
                <button onClick={onClose} className="text-gray-300 hover:text-white bg-black/30 p-2 rounded-full">
                    <IconX className="w-6 h-6" />
                </button>
            </div>
        </div>

        <div className="flex-1 bg-black/30 rounded-2xl p-6 flex flex-col justify-center items-center relative overflow-hidden">
             {!isLive && <p className="text-white text-lg">{error || 'Conectando...'}</p>}
             {isLive && (
                 <div className="text-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-pulse"></div>
                        <img src={host.avatarUrl} alt="Host" className="w-32 h-32 rounded-full relative border-4 border-indigo-500" />
                    </div>
                    <p className="mt-4 text-white text-xl font-semibold">
                      {role === 'host' ? 'Você está ao vivo!' : `Ouvindo ${host.name}`}
                    </p>
                    <p className="text-gray-400">{role === 'host' ? 'Sua voz está sendo transmitida.' : 'Conectado à transmissão.'}</p>
                 </div>
             )}
             {role === 'listener' && isLive && (
                <div className="absolute bottom-4 right-4 bg-black/40 p-2 rounded-full flex items-center space-x-2">
                    {volume > 0 ? <IconVolume2 className="w-5 h-5 text-white" /> : <IconVolumeX className="w-5 h-5 text-white" />}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             )}
        </div>

        <div className="h-1/3 flex flex-col mt-4">
            <div className="flex-1 bg-black/30 rounded-t-2xl p-4 overflow-y-auto space-y-3">
                 {comments.map(comment => (
                    <div key={comment.id} className="flex items-start animate-fade-in-up">
                        <img src={comment.user.avatarUrl} alt={comment.user.name} className="w-8 h-8 rounded-full mr-3" />
                        <div>
                            <p className="font-semibold text-indigo-300 text-sm">{comment.user.name}</p>
                            <p className="text-white">{comment.text}</p>
                        </div>
                    </div>
                ))}
                 <div ref={commentsEndRef}></div>
            </div>
            <form onSubmit={handleCommentSubmit} className="bg-black/50 rounded-b-2xl p-4 flex items-center space-x-3">
                <img src={currentUser.avatarUrl} alt="Você" className="w-9 h-9 rounded-full" />
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Envie um comentário..."
                    className="w-full bg-gray-800 text-white border-transparent rounded-full py-2 px-4 focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors disabled:bg-gray-700">
                    <IconSend className="w-5 h-5"/>
                </button>
            </form>
        </div>
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        
        /* Custom range slider style */
        input[type=range] {
            -webkit-appearance: none;
            background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            margin-top: -6px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 2px;
            cursor: pointer;
            background: #4f46e5; /* indigo-500 */
        }
      `}</style>
    </div>
  );
};