
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveSession as GeminiLiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { supabase } from '../services/supabaseService';
import * as db from '../services/supabaseService';
import type { LiveSession, UserProfile, LiveComment, User } from '../types';
import { IconX, IconSend, IconUsers } from './Icons';
import { LiveIndicator } from './LiveIndicator';

// Helper functions for audio processing (as per Gemini guidelines)
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

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  // FIX: Corrected typo from dataInt116 to dataInt16
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface LiveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSession;
  host: UserProfile;
}

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session, host }) => {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const geminiSessionRef = useRef<Promise<GeminiLiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const channel = supabase.channel(`live-session:${session.id}`, {
      config: {
        presence: {
          key: host.id, // a unique key for this client
        },
      },
    });

    // --- Realtime Subscriptions ---
    const commentsSubscription = channel
      .on('postgres_changes', { 
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
            user: {
                name: newCommentPayload.user_name,
                avatarUrl: newCommentPayload.user_avatar_url
            }
        }
        setComments(prev => [...prev, formattedComment]);
      })

    // --- Presence for Viewer Count ---
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      setViewerCount(Object.keys(presenceState).length);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    // --- Gemini Live Setup ---
    const setupGeminiLive = async () => {
        try {
            if (!process.env.API_KEY) {
                throw new Error("API Key do Gemini não está configurada.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = outputAudioContext;
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);
            let nextStartTime = 0;

            geminiSessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: 'Você é um co-apresentador em uma live de áudio. Seja divertido, engajante e interaja com o anfitrião.',
                },
                callbacks: {
                    onopen: async () => {
                        setIsLive(true);
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaStreamRef.current = stream;

                        const inputAudioContext = new AudioContext({ sampleRate: 16000 });
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            geminiSessionRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e) => {
                        console.error('Gemini Live Error:', e);
                        setError("Ocorreu um erro na conexão com a IA.");
                        setIsLive(false);
                    },
                    onclose: () => {
                        setIsLive(false);
                    },
                },
            });
        } catch (err: any) {
            console.error("Failed to start Gemini Live session:", err);
            setError(err.message || "Falha ao iniciar a live. Verifique as permissões do microfone.");
            setIsLive(false);
        }
    };
    
    setupGeminiLive();

    return () => {
      supabase.removeChannel(channel);
      geminiSessionRef.current?.then(s => s.close());
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
      setIsLive(false);
    };
  }, [isOpen, session.id, host.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      await db.addLiveComment(session.id, host, newComment.trim());
      setNewComment('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-4 transition-opacity duration-300 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        {/* Header */}
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

        {/* Main Content */}
        <div className="flex-1 bg-black/30 rounded-2xl p-6 flex flex-col justify-center items-center relative overflow-hidden">
             {!isLive && <p className="text-white text-lg">{error || 'Conectando...'}</p>}
             {isLive && (
                 <div className="text-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-pulse"></div>
                        <img src={host.avatarUrl} alt="Host" className="w-32 h-32 rounded-full relative border-4 border-indigo-500" />
                    </div>
                    <p className="mt-4 text-white text-xl font-semibold">Conversando com a IA...</p>
                    <p className="text-gray-400">Sua voz está sendo transmitida.</p>
                 </div>
             )}
        </div>

        {/* Comments Section */}
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
                <img src={host.avatarUrl} alt="Você" className="w-9 h-9 rounded-full" />
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
      `}</style>
    </div>
  );
};
