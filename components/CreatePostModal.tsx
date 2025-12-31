
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateCaptionForImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { IconSparkles, IconX, IconUpload, IconCamera, IconType, IconSmile, IconCrop, IconMic } from './Icons';
import type { NewPost } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSubmit: (post: NewPost) => void;
  onStartLiveSession: () => void;
}

type Step = 'selectType' | 'upload' | 'editText' | 'editImage' | 'finalize';
type PostType = 'image' | 'text';
type AspectRatio = '1/1' | '4/5' | '16/9';
type TextOverlay = { text: string; color: string };
type EmojiOverlay = { emoji: string; size: number };

const FILTERS = [
  { name: 'Normal', className: '' },
  { name: 'Vintage', className: 'sepia-[.5] contrast-125 brightness-90' },
  { name: 'P&B', className: 'grayscale' },
  { name: 'Sonho', className: 'saturate-150 contrast-125' },
];

const EMOJIS = ['😂', '😍', '🤔', '🔥', '🎉', '👍', '❤️', '🤯'];

// Utility to generate an image from text
const generateImageFromText = (text: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');

        const width = 1080;
        const height = 1080;
        canvas.width = width;
        canvas.height = height;

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#3B82F6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Set text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Adjust font size based on text length
        let fontSize = 100;
        const maxLineWidth = width - 100;
        do {
            fontSize -= 5;
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        } while (ctx.measureText(text.split('\n')[0]).width > maxLineWidth && fontSize > 30);
        
        // Wrap text
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const widthWithWord = ctx.measureText(currentLine + " " + word).width;
            if (widthWithWord < maxLineWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        // Draw lines
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        let y = (height - totalHeight) / 2 + lineHeight / 2;

        for (const line of lines) {
            ctx.fillText(line, width / 2, y);
            y += lineHeight;
        }

        canvas.toBlob(blob => {
            if (blob) {
                resolve(new File([blob], 'text-post.png', { type: 'image/png' }));
            } else {
                reject('Failed to create blob from canvas');
            }
        }, 'image/png');
    });
};


export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostSubmit, onStartLiveSession }) => {
  const [step, setStep] = useState<Step>('selectType');
  const [postType, setPostType] = useState<PostType | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processedImageFile, setProcessedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing states
  const [filter, setFilter] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1/1');
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [emojiOverlay, setEmojiOverlay] = useState<EmojiOverlay | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const resetState = useCallback(() => {
    setStep('selectType');
    setPostType(null);
    setImageFile(null);
    setProcessedImageFile(null);
    setPreviewUrl(null);
    setCaption('');
    setTextContent('');
    setError(null);
    setIsProcessing(false);
    setFilter('');
    setAspectRatio('1/1');
    setTextOverlay(null);
    setShowTextEditor(false);
    setEmojiOverlay(null);
    setShowEmojiPicker(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('editImage');
    }
  };
  
  const handleGenerateCaption = useCallback(async () => {
    const fileToProcess = processedImageFile || imageFile;
    if (!fileToProcess) return;
    setIsProcessing(true);
    try {
      const generatedCaption = await generateCaptionForImage(fileToProcess);
      setCaption(generatedCaption);
    } catch (e) { setError("Falha ao gerar legenda."); } 
    finally { setIsProcessing(false); }
  }, [imageFile, processedImageFile]);

  const processAndFinalize = async () => {
      if (postType === 'text') {
          setIsProcessing(true);
          const file = await generateImageFromText(textContent);
          setProcessedImageFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setIsProcessing(false);
          setStep('finalize');
      } else if (postType === 'image' && imageFile) {
          setIsProcessing(true);
          const img = imageRef.current;
          if (!img) { setIsProcessing(false); return; }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { setIsProcessing(false); return; }

          const dpr = window.devicePixelRatio || 1;
          const { naturalWidth, naturalHeight } = img;

          // Aspect ratio calculations
          const aspectValues: {[key in AspectRatio]: number} = { '1/1': 1, '4/5': 4 / 5, '16/9': 16 / 9 };
          const targetAspect = aspectValues[aspectRatio];
          
          let sx = 0, sy = 0, sWidth = naturalWidth, sHeight = naturalHeight;
          const currentAspect = naturalWidth / naturalHeight;

          if (currentAspect > targetAspect) { // image is wider than target
              sWidth = naturalHeight * targetAspect;
              sx = (naturalWidth - sWidth) / 2;
          } else { // image is taller than target
              sHeight = naturalWidth / targetAspect;
              sy = (naturalHeight - sHeight) / 2;
          }

          canvas.width = sWidth * dpr;
          canvas.height = sHeight * dpr;
          ctx.scale(dpr, dpr);

          if(filter) ctx.filter = getComputedStyle(img).filter;
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
          
          // Draw text
          if (textOverlay) {
              ctx.font = 'bold 64px Inter, sans-serif';
              ctx.fillStyle = textOverlay.color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(textOverlay.text, sWidth / 2, sHeight / 2);
          }
          // Draw emoji
          if (emojiOverlay) {
              ctx.font = `${emojiOverlay.size}px sans-serif`;
              ctx.fillText(emojiOverlay.emoji, sWidth / 2, sHeight / 2 + (textOverlay ? 80 : 0));
          }

          canvas.toBlob(blob => {
              if (blob) {
                  const file = new File([blob], imageFile.name, { type: 'image/png' });
                  setProcessedImageFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
              }
              setIsProcessing(false);
              setStep('finalize');
          }, 'image/png');
      }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const finalFile = processedImageFile || imageFile;
    if (finalFile && caption) {
      onPostSubmit({ imageFile: finalFile, caption });
    } else {
      setError("Imagem e legenda são necessárias.");
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
  };
  
  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
      case 'selectType':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">O que você quer criar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => { setPostType('image'); setStep('upload'); }} className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <IconCamera className="w-12 h-12 text-indigo-400 mb-2"/> <span className="font-semibold">Foto</span>
              </button>
              <button onClick={() => { setPostType('text'); setStep('editText'); }} className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <IconType className="w-12 h-12 text-purple-400 mb-2"/> <span className="font-semibold">Texto</span>
              </button>
               <button onClick={onStartLiveSession} className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <IconMic className="w-12 h-12 text-red-400 mb-2"/> <span className="font-semibold">Sessão de Áudio</span>
              </button>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
            <IconUpload className="w-12 h-12 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400">Arraste e solte ou clique para selecionar</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>
        );

      case 'editText':
         return (
          <>
            <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="No que você está pensando?" className="w-full h-48 p-3 bg-white/5 text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors placeholder-gray-400" />
            <div className="flex justify-end mt-4">
              <button onClick={processAndFinalize} disabled={!textContent.trim() || isProcessing} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500">{isProcessing ? 'Processando...' : 'Próximo'}</button>
            </div>
          </>
        );

      case 'editImage':
        return (
          <div>
            <div className="relative w-full overflow-hidden mb-4" style={{ aspectRatio }}>
              <img ref={imageRef} src={previewUrl!} alt="Preview" className={`w-full h-full object-cover ${filter}`} />
              {textOverlay && <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold pointer-events-none" style={{ color: textOverlay.color, textShadow: '0 0 8px black' }}>{textOverlay.text}</div>}
              {emojiOverlay && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ fontSize: `${emojiOverlay.size}px`, textShadow: '0 0 8px black', paddingTop: textOverlay ? '60px' : '0' }}>{emojiOverlay.emoji}</div>}
            </div>
            
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex justify-around bg-white/5 p-2 rounded-lg">
                <button onClick={() => {setShowTextEditor(!showTextEditor); setShowEmojiPicker(false);}} className="p-2 hover:bg-white/10 rounded-full"><IconType/></button>
                <button onClick={() => {setShowEmojiPicker(!showEmojiPicker); setShowTextEditor(false);}} className="p-2 hover:bg-white/10 rounded-full"><IconSmile/></button>
              </div>

              {showTextEditor && (
                <div className="flex gap-2 items-center">
                  <input type="text" placeholder="Adicionar texto..." onChange={(e) => setTextOverlay(p => ({...p!, text: e.target.value}))} className="flex-grow bg-white/10 p-2 rounded-lg"/>
                  <input type="color" defaultValue="#FFFFFF" onChange={(e) => setTextOverlay(p => ({...p!, color: e.target.value}))} className="bg-transparent"/>
                </div>
              )}
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-lg">
                  {EMOJIS.map(e => <button key={e} onClick={() => setEmojiOverlay({emoji: e, size: 100})} className="text-3xl p-1 hover:bg-white/10 rounded-lg">{e}</button>)}
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Proporção</h4>
                <div className="flex gap-2">
                  {(['1/1', '4/5', '16/9'] as AspectRatio[]).map(ar => <button key={ar} onClick={() => setAspectRatio(ar)} className={`flex-1 p-2 rounded-lg ${aspectRatio === ar ? 'bg-indigo-600' : 'bg-white/10'}`}>{ar}</button>)}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Filtros</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {FILTERS.map(f => <button key={f.name} onClick={() => setFilter(f.className)} className="text-center space-y-1"><div className={`w-16 h-16 rounded-lg bg-gray-500 ${f.className} ${filter === f.className ? 'ring-2 ring-indigo-500' : ''}`}></div><span className="text-xs">{f.name}</span></button>)}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button onClick={() => setStep('upload')} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Voltar</button>
              <button onClick={processAndFinalize} disabled={isProcessing} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold">{isProcessing ? 'Processando...' : 'Próximo'}</button>
            </div>
          </div>
        );

      case 'finalize':
        return (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
                <img src={previewUrl!} alt="Final Preview" className="w-full h-auto object-contain rounded-lg" />
            </div>
            <div className="w-full sm:w-1/2 space-y-4">
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva uma legenda..." className="w-full h-32 p-3 bg-white/5 text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors" />
              <button type="button" onClick={handleGenerateCaption} disabled={isProcessing} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 rounded-lg font-semibold transition-colors disabled:bg-purple-800/50">
                {isProcessing ? <LoadingSpinner /> : <IconSparkles className="w-5 h-5" />}
                <span>{isProcessing ? 'Gerando...' : 'Gerar Legenda com IA'}</span>
              </button>
              <button type="submit" disabled={!caption || isProcessing} className="w-full px-4 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-bold text-lg transition-all disabled:from-gray-600 disabled:cursor-not-allowed">
                Postar
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in" onClick={handleOverlayClick}>
      <div ref={modalRef} className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto transform scale-95 transition-all duration-300" style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}>
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"><IconX className="w-6 h-6" /></button>
          <form onSubmit={handleSubmit}>
            {renderContent()}
          </form>
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        </div>
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
};
