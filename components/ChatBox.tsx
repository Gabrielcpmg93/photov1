
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, UserProfile } from '../types';
import { IconSend } from './Icons';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: UserProfile;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, currentUser }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="absolute bottom-20 left-4 right-4 h-64 flex flex-col z-0">
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 mask-image">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2 text-sm animate-fade-in ${msg.user.id === currentUser.id ? 'justify-end' : ''}`}>
                    {msg.user.id !== currentUser.id && (
                        <img src={msg.user.avatarUrl} alt={msg.user.name} className="w-6 h-6 rounded-full mt-1" />
                    )}
                    <div className={`p-2 rounded-lg max-w-xs ${msg.user.id === currentUser.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                        {msg.user.id !== currentUser.id && <p className="font-bold text-indigo-300 text-xs mb-1">{msg.user.name}</p>}
                        <p>{msg.text}</p>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="mt-2 flex items-center space-x-2">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enviar uma mensagem..."
                className="w-full bg-black/30 text-white border border-gray-600 rounded-full py-2 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400"
            />
            <button type="submit" disabled={!text.trim()} className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 disabled:bg-gray-600 transition-colors">
                <IconSend className="w-5 h-5" />
            </button>
        </form>
        <style>{`
            .mask-image {
                mask-image: linear-gradient(to top, transparent 0%, black 15%);
                -webkit-mask-image: linear-gradient(to top, transparent 0%, black 15%);
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};
