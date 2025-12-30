
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateCaptionForImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { IconSparkles, IconX, IconUpload } from './Icons';
import type { NewPost } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSubmit: (post: NewPost) => void;
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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
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
    if (imageFile && caption) {
      onPostSubmit({ imageFile, caption });
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto transform scale-95 transition-all duration-300"
        style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
      >
        <div className="p-6 relative">
          <h2 className="text-2xl font-bold text-center mb-4 text-white">Criar Nova Postagem</h2>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
            <IconX className="w-6 h-6" />
          </button>
          <form onSubmit={handleSubmit}>
            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-gray-500 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-white/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload className="w-12 h-12 mx-auto text-gray-500 mb-2" />
                <p className="text-gray-400">Arraste e solte ou clique para selecionar</p>
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
                  className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-400"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={handleGenerateCaption}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 rounded-lg font-semibold transition-colors disabled:bg-purple-800/50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <LoadingSpinner /> : <IconSparkles className="w-5 h-5" />}
                  <span>{isGenerating ? 'Gerando...' : 'Gerar Legenda com IA'}</span>
                </button>
              </div>
            )}
            
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            
            <button
              type="submit"
              disabled={!imageFile || !caption}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-bold text-lg transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 transform hover:scale-105"
            >
              Postar
            </button>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
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
