
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import * as db from '../services/supabaseService';
import type { LiveSession, UserProfile, LiveComment, LiveSessionWithHost } from '../types';
import { IconX, IconSend, IconUsers, IconVolume2, IconVolumeX, IconMic, IconMicOff } from './Icons';
import { LiveIndicator } from './LiveIndicator';
import { ListenersPanel } from './ListenersPanel';
import { InvitationToast } from './InvitationToast';

type Participant = { id: string; name: string; avatarUrl: string; is_speaking?: boolean };
type Role = 'host' | 'speaker' | 'listener';

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
const MAX_SPEAKERS = 2; // Host + 2 speakers

export const LiveAudioModal: React.FC<LiveAudioModalProps> = ({ isOpen, onClose, session: initialSession, currentUser, role: initialRole }) => {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>(initialRole);
  const [speakers, setSpeakers] = useState<Participant[]>([]);
  const [listeners, setListeners] = useState<Participant[]>([]);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const [showListenersPanel, setShowListenersPanel] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<Participant | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const channelRef = useRef<any>(null);

  // Use a map to handle playback for multiple speakers
  const playbackStateRef = useRef(new Map<string, { queue: AudioBuffer[], isPlaying: boolean, nextStartTime: number }>());

  const host = 'host' in initialSession ? initialSession.host : currentUser;
  const hostId = 'host_id' in initialSession ? initialSession.host_id : currentUser.id;

  const isCurrentUserSpeaker = currentRole === 'host' || currentRole === 'speaker';
  
  // --- Audio Broadcasting and Playback Logic ---
  const stopBroadcasting = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    sourceRef.current?.disconnect();
    scriptProcessorRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
  }, []);

  const startBroadcasting = useCallback(async () => {
    if (mediaStreamRef.current) return; // Already broadcasting
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
        const int16 = new Int16Array(inputData.buffer);
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
      setCurrentRole('listener');
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

  // --- Effect for handling role changes ---
  useEffect(() => {
    if (isCurrentUserSpeaker) {
      startBroadcasting();
    } else {
      stopBroadcasting();
    }
  }, [isCurrentUserSpeaker, startBroadcasting, stopBroadcasting]);


  // --- Main useEffect for Supabase Channel ---
  useEffect(() => {
    if (!isOpen) return;

    // Initialize audio context for playback
    const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    gainNodeRef.current = context.createGain();
    gainNodeRef.current.connect(context.destination);
    audioContextRef.current = context;

    const channel = supabase.channel(`live-session:${initialSession.id}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    const handleRoleChange = (payload: { userId: string, newRole: Role }) => {
        setSpeakers(s => s.filter(p => p.id !== payload.userId));
        setListeners(l => l.filter(p => p.id !== payload.userId));

        const participant = [...speakers, ...listeners].find(p => p.id === payload.userId) 
          || (payload.userId === hostId && { id: hostId, name: host.name, avatarUrl: host.avatarUrl })
          || (payload.userId === currentUser.id && currentUser);
        
        if (!participant) return;

        if(payload.newRole === 'speaker' || payload.newRole === 'host') {
            setSpeakers(s => [...s, participant].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i));
        } else {
            setListeners(l => [...l, participant].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i));
        }

        if (payload.userId === currentUser.id) {
            setCurrentRole(payload.newRole);
        }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participants: Participant[] = Object.entries(presenceState).map(([_, val]: any) => ({
            id: val[0].user_id,
            name: val[0].name,
            avatarUrl: val[0].avatar_url,
        }));
        // Host is always a speaker
        const currentSpeakers = speakers.length > 0 ? speakers : [{ id: hostId, name: host.name, avatarUrl: host.avatarUrl }];
        const speakerIds = new Set(currentSpeakers.map(s => s.id));
        
        setSpeakers(participants.filter(p => speakerIds.has(p.id)));
        setListeners(participants.filter(p => !speakerIds.has(p.id)));
        setViewerCount(participants.length);
      })
      .on('broadcast', { event: 'audio-chunk' }, ({ payload }) => {
          if (!playbackStateRef.current.has(payload.senderId)) {
            playbackStateRef.current.set(payload.senderId, { queue: [], isPlaying: false, nextStartTime: 0 });
          }
          const speakerState = playbackStateRef.current.get(payload.senderId)!;
          const decodedData = decode(payload.chunk);
          const dataInt16 = new Int16Array(decodedData.buffer);
          
          if (!audioContextRef.current) return;
          const audioBuffer = audioContextRef.current.createBuffer(1, dataInt16.length, SAMPLE_RATE);
          audioBuffer.getChannelData(0).set(dataInt16.map(v => v / 32768.0));

          speakerState.queue.push(audioBuffer);
          if (!speakerState.isPlaying) {
            schedulePlayback(payload.senderId);
          }
      })
      .on('broadcast', { event: 'invite-to-speak' }, ({ payload }) => {
        if (payload.userId === currentUser.id) {
            setPendingInvitation(payload.inviter);
        }
      })
      .on('broadcast', { event: 'role-change' }, ({ payload }) => {
        handleRoleChange(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          await channel.track({
            user_id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatarUrl
          });
          if (initialRole === 'host') {
            setSpeakers([{ id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl }]);
          }
        }
      });
    
    return () => {
      stopBroadcasting();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      playbackStateRef.current.clear();
      gainNodeRef.current = null;
    };
  }, [isOpen, initialSession.id, currentUser, initialRole, host, hostId, schedulePlayback, startBroadcasting, stopBroadcasting]);

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
  }, [volume]);
  
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      await db.addLiveComment(initialSession.id, currentUser, newComment.trim());
      setNewComment('');
    }
  };
  
  const sendRoleChange = (userId: string, newRole: Role) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'role-change',
      payload: { userId, newRole },
    });
  };

  const handleInvite = (user: Participant) => {
    if(speakers.length > MAX_SPEAKERS) return;
    setInvitedUserIds(prev => new Set(prev).add(user.id));
    channelRef.current?.send({
        type: 'broadcast', event: 'invite-to-speak',
        payload: { userId: user.id, inviter: {id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl}},
    });
  };

  const handleInvitationAccept = () => {
    if(!pendingInvitation) return;
    sendRoleChange(currentUser.id, 'speaker');
    setPendingInvitation(null);
  };
  
  const handleRemoveSpeaker = (speakerId: string) => {
    sendRoleChange(speakerId, 'listener');
  };

  if (!isOpen) return null;
  
  const speakerSlots = [...speakers];
  while(speakerSlots.length <= MAX_SPEAKERS) {
    speakerSlots.push({ id: `placeholder-${speakerSlots.length}`, name: 'Vazio', avatarUrl: ''});
  }
  
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-4 transition-opacity duration-300 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <img src={host.avatarUrl} alt={host.name} className="w-12 h-12 rounded-full" />
                    <div className="absolute -bottom-1 -right-1"><LiveIndicator /></div>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{host.name}</h2>
                    <p className="text-gray-400">Sala de áudio</p>
                </div>
            </div>
             <div className="flex items-center space-x-4">
                <button onClick={() => setShowListenersPanel(true)} className="flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full">
                    <IconUsers className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">{viewerCount}</span>
                </button>
                <button onClick={onClose} className="text-gray-300 hover:text-white bg-black/30 p-2 rounded-full">
                    <IconX className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Speakers Stage */}
        <div className="grid grid-cols-3 gap-4 rounded-2xl p-6 bg-black/30 min-h-[200px]">
            {speakerSlots.map((speaker) => (
                <div key={speaker.id} className="flex flex-col items-center justify-center text-center">
                    {speaker.avatarUrl ? (
                         <div className="relative">
                            <img src={speaker.avatarUrl} alt={speaker.name} className="w-24 h-24 rounded-full border-4 border-indigo-500" />
                            {currentRole === 'host' && speaker.id !== currentUser.id && (
                                <button onClick={() => handleRemoveSpeaker(speaker.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"><IconX className="w-4 h-4"/></button>
                            )}
                            {isCurrentUserSpeaker && speaker.id === currentUser.id && (
                               <button onClick={() => setIsMicMuted(m => !m)} className="absolute bottom-0 right-0 bg-gray-700 text-white rounded-full p-2">{isMicMuted ? <IconMicOff className="w-5 h-5" /> : <IconMic className="w-5 h-5"/>}</button>
                            )}
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
                           <IconMic className="w-8 h-8 text-gray-600" />
                        </div>
                    )}
                    <p className="mt-2 text-white font-semibold truncate w-full">{speaker.name}</p>
                </div>
            ))}
        </div>
        
        {/* Controls and Comments */}
        <div className="flex-1 flex flex-col mt-4 min-h-0">
             <div className="flex-1 bg-black/30 rounded-t-2xl p-4 overflow-y-auto space-y-3">
                 {comments.map(c => <div key={c.id} className="flex items-start animate-fade-in-up"><img src={c.user.avatarUrl} alt={c.user.name} className="w-8 h-8 rounded-full mr-3" /><div><p className="font-semibold text-indigo-300 text-sm">{c.user.name}</p><p className="text-white">{c.text}</p></div></div>)}
                 <div ref={commentsEndRef}></div>
            </div>
            <form onSubmit={handleCommentSubmit} className="bg-black/50 rounded-b-2xl p-4 flex items-center space-x-3"><img src={currentUser.avatarUrl} alt="Você" className="w-9 h-9 rounded-full" /><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Envie um comentário..." className="w-full bg-gray-800 text-white border-transparent rounded-full py-2 px-4 focus:ring-2 focus:ring-indigo-500" /><button type="submit" className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors disabled:bg-gray-700"><IconSend className="w-5 h-5"/></button></form>
        </div>
      </div>
      
      {/* Listeners Panel */}
      <ListenersPanel isOpen={showListenersPanel} onClose={() => setShowListenersPanel(false)} listeners={listeners} invitedIds={invitedUserIds} onInvite={handleInvite} canInvite={currentRole === 'host' && speakers.length <= MAX_SPEAKERS} />

      {/* Invitation Toast */}
      {pendingInvitation && <InvitationToast inviter={pendingInvitation} onAccept={handleInvitationAccept} onDecline={() => setPendingInvitation(null)} />}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}.animate-fade-in{animation:fadeIn .3s ease-out forwards}@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in-up{animation:fadeInUp .5s ease-out forwards}`}</style>
    </div>
  );
};
