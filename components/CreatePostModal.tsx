
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateCaptionForImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { IconSparkles, IconX, IconUpload } from './Icons';
import type { Post } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSubmit: (post: Omit<Post, 'id' | 'likes' | 'comments' | 'user'>) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostSubmit }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setImageFile(null);
      setPreviewUrl(null);
      setCaption('');
      setError(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerateCaption = useCallback(async () => {
    if (!imageFile) {
      setError("Por favor, selecione uma imagem primeiro.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const generatedCaption = await generateCaptionForImage(imageFile);
      setCaption(generatedCaption);
    } catch (e) {
      setError("Falha ao gerar legenda.");
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile]);
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (previewUrl && caption) {
      onPostSubmit({ imageUrl: previewUrl, caption });
    } else {
      setError("Imagem e legenda são necessárias.");
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto transform scale-95 transition-all duration-300 animate-fade-in-up"
        style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
      >
        <div className="p-6 relative">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">Criar Nova Postagem</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <IconX className="w-6 h-6" />
          </button>
          <form onSubmit={handleSubmit}>
            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Arraste e solte uma imagem ou clique para selecionar</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="mb-4">
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-72 object-contain rounded-lg" />
              </div>
            )}
            
            {imageFile && (
              <div className="space-y-4">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva uma legenda..."
                  className="w-full p-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={handleGenerateCaption}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <LoadingSpinner /> : <IconSparkles className="w-5 h-5" />}
                  <span>{isGenerating ? 'Gerando...' : 'Gerar Legenda com IA'}</span>
                </button>
              </div>
            )}
            
            {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
            
            <button
              type="submit"
              disabled={!imageFile || !caption}
              className="w-full mt-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold text-lg transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Postar
            </button>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
