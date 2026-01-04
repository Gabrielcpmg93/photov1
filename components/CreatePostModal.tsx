
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateCaptionForImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { IconSparkles, IconX, IconUpload, IconCamera, IconType, IconSmile } from './Icons';
import type { NewPost } from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSubmit: (post: NewPost) => void;
}

type Step = 'selectType' | 'upload' | 'editText' | 'editImage' | 'finalize';
type PostType = 'image' | 'text';
type AspectRatio = '1/1' | '4/5' | '16/9';
type TextOverlay = { text: string; color: string; fontFamily: string; x: number; y: number; size: number; };
type EmojiOverlay = { emoji: string; size: number; x: number; y: number; };

const FILTERS = [
  { name: 'Normal', className: '' },
  { name: 'Vintage', className: 'sepia-[.5] contrast-125 brightness-90' },
  { name: 'P&B', className: 'grayscale' },
  { name: 'Sonho', className: 'saturate-150 contrast-125' },
];

const EMOJIS = ['😂', '😍', '🤔', '🔥', '🎉', '👍', '❤️', '🤯', '😭', '💀', '💯', '✨', '👀', '👋', '🙏', '😎'];
const FONT_FACES = ['Inter', 'Georgia', 'Courier New', 'Brush Script MT', 'Arial Black', 'Comic Sans MS'];
const COLOR_SWATCHES = ['#FFFFFF', '#000000', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6'];

const generateGradientBackground = (): Promise<File> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');
        const width = 1080; const height = 1080; canvas.width = width; canvas.height = height;
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#8B5CF6'); gradient.addColorStop(1, '#3B82F6');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        canvas.toBlob(blob => {
            if (blob) { resolve(new File([blob], 'gradient-background.png', { type: 'image/png' })); }
            else { reject('Failed to create blob from canvas'); }
        }, 'image/png');
    });
};

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostSubmit }) => {
  const [step, setStep] = useState<Step>('selectType');
  const [postType, setPostType] = useState<PostType | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processedImageFile, setProcessedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1/1');
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [emojiOverlay, setEmojiOverlay] = useState<EmojiOverlay | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dragInfo, setDragInfo] = useState<{ target: 'text' | 'emoji'; offsetX: number; offsetY: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const initialPinchStateRef = useRef<{ distance: number; size: number } | null>(null);
  
  const resetState = useCallback(() => {
    setStep('selectType'); setPostType(null); setImageFile(null); setProcessedImageFile(null); setPreviewUrl(null);
    setCaption(''); setTextContent(''); setError(null); setIsProcessing(false); setFilter(''); setAspectRatio('1/1');
    setTextOverlay(null); setShowTextEditor(false); setEmojiOverlay(null); setShowEmojiPicker(false); setDragInfo(null);
  }, []);

  useEffect(() => { if (!isOpen) { resetState(); } }, [isOpen, resetState]);
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    if (isOpen) { document.body.style.overflow = 'hidden'; window.addEventListener('keydown', handleEsc); } 
    else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; window.removeEventListener('keydown', handleEsc); };
  }, [isOpen, onClose]);
  
  useEffect(() => {
    if (step === 'editImage' && postType === 'text' && textContent && !textOverlay && imageContainerRef.current) {
        const container = imageContainerRef.current;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        setTextOverlay({
            text: textContent,
            color: '#FFFFFF',
            fontFamily: 'Inter',
            size: 48,
            x: containerWidth / 2,
            y: containerHeight / 2,
        });
    }
  }, [step, postType, textContent, textOverlay]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setError(null); setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); setStep('editImage'); }
  };
  
  const handleGenerateCaption = useCallback(async () => {
    const fileToProcess = processedImageFile || imageFile;
    if (!fileToProcess) return;
    setIsProcessing(true);
    try { const generatedCaption = await generateCaptionForImage(fileToProcess); setCaption(generatedCaption); } 
    catch (e) { setError("Falha ao gerar legenda."); } 
    finally { setIsProcessing(false); }
  }, [imageFile, processedImageFile]);
  
  const handleTextPostNext = async () => {
      if (!textContent.trim()) return;
      setIsProcessing(true);
      const bgFile = await generateGradientBackground();
      setImageFile(bgFile);
      setPreviewUrl(URL.createObjectURL(bgFile));
      setIsProcessing(false);
      setStep('editImage');
  };

  const processAndFinalize = async () => {
      setIsProcessing(true);
      const img = imageRef.current; const container = imageContainerRef.current;
      if (!img || !container || !imageFile) { setIsProcessing(false); return; }
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      if (!ctx) { setIsProcessing(false); return; }

      const { naturalWidth, naturalHeight } = img;
      const aspectValues: {[key in AspectRatio]: number} = { '1/1': 1, '4/5': 4 / 5, '16/9': 16 / 9 };
      const targetAspect = aspectValues[aspectRatio];
      let sx = 0, sy = 0, sWidth = naturalWidth, sHeight = naturalHeight;
      const currentAspect = naturalWidth / naturalHeight;
      if (currentAspect > targetAspect) { sWidth = naturalHeight * targetAspect; sx = (naturalWidth - sWidth) / 2; } 
      else { sHeight = naturalWidth / targetAspect; sy = (naturalHeight - sHeight) / 2; }
      canvas.width = sWidth; canvas.height = sHeight;
      if(filter) ctx.filter = getComputedStyle(img).filter;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      
      const previewRect = container.getBoundingClientRect();
      const scaleX = sWidth / previewRect.width;
      const scaleY = sHeight / previewRect.height;

      if (textOverlay) {
          const fontSize = textOverlay.size * scaleX;
          ctx.font = `bold ${fontSize}px "${textOverlay.fontFamily}", sans-serif`; ctx.fillStyle = textOverlay.color;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(textOverlay.text, textOverlay.x * scaleX, textOverlay.y * scaleY);
      }
      if (emojiOverlay) {
          const fontSize = emojiOverlay.size * scaleX;
          ctx.font = `${fontSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(emojiOverlay.emoji, emojiOverlay.x * scaleX, emojiOverlay.y * scaleY);
      }

      canvas.toBlob(blob => {
          if (blob) {
              const file = new File([blob], imageFile.name, { type: 'image/png' });
              setProcessedImageFile(file); setPreviewUrl(URL.createObjectURL(file));
          }
          setIsProcessing(false); setStep('finalize');
      }, 'image/png');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const finalFile = processedImageFile || imageFile;
    if (finalFile && caption) { onPostSubmit({ imageFile: finalFile, caption }); } 
    else { setError("Imagem e legenda são necessárias."); }
  };

  const handleDragStart = (e: React.PointerEvent, target: 'text' | 'emoji') => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setDragInfo({ target, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, });
    el.setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragInfo || !imageContainerRef.current) return;
    e.preventDefault();
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - dragInfo.offsetX;
    let newY = e.clientY - containerRect.top - dragInfo.offsetY;

    if (dragInfo.target === 'text' && textOverlay) {
      setTextOverlay(p => p ? { ...p, x: newX + (e.currentTarget as HTMLElement).offsetWidth / 2, y: newY + (e.currentTarget as HTMLElement).offsetHeight / 2 } : null);
    } else if(emojiOverlay) {
      setEmojiOverlay(p => p ? { ...p, x: newX + (e.currentTarget as HTMLElement).offsetWidth / 2, y: newY + (e.currentTarget as HTMLElement).offsetHeight / 2 } : null);
    }
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragInfo(null);
  };
  
  const getTouchDistance = (touches: React.TouchList) => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
  };

  const handleTouchStart = (e: React.TouchEvent, target: 'text' | 'emoji') => {
      if (e.touches.length === 2) {
          e.preventDefault();
          initialPinchStateRef.current = {
              distance: getTouchDistance(e.touches),
              size: target === 'text' ? textOverlay!.size : emojiOverlay!.size
          };
      }
  };

  const handleTouchMove = (e: React.TouchEvent, target: 'text' | 'emoji') => {
      if (e.touches.length === 2 && initialPinchStateRef.current) {
          e.preventDefault();
          const newDist = getTouchDistance(e.touches);
          const scale = newDist / initialPinchStateRef.current.distance;
          const newSize = initialPinchStateRef.current.size * scale;
          const clampedSize = Math.max(16, Math.min(256, newSize));

          if (target === 'text') {
              setTextOverlay(p => p ? { ...p, size: clampedSize } : null);
          } else {
              setEmojiOverlay(p => p ? { ...p, size: clampedSize } : null);
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchStateRef.current = null;
      }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
  
  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
      case 'selectType': return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">O que você quer criar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => { setPostType('image'); setStep('upload'); }} className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <IconCamera className="w-12 h-12 text-indigo-400 mb-2"/> <span className="font-semibold">Foto</span>
              </button>
              <button onClick={() => { setPostType('text'); setStep('editText'); }} className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <IconType className="w-12 h-12 text-purple-400 mb-2"/> <span className="font-semibold">Texto</span>
              </button>
            </div>
          </div> );
      case 'upload': return (
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
            <IconUpload className="w-12 h-12 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400">Arraste e solte ou clique para selecionar</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div> );
      case 'editText': return ( <>
            <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="No que você está pensando?" className="w-full h-48 p-3 bg-white/5 text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors placeholder-gray-400" />
            <div className="flex justify-end mt-4">
              <button onClick={handleTextPostNext} disabled={!textContent.trim() || isProcessing} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500">{isProcessing ? 'Processando...' : 'Próximo'}</button>
            </div> </> );
      case 'editImage': return ( <div>
            <div ref={imageContainerRef} className="relative w-full overflow-hidden mb-4 select-none touch-none" style={{ aspectRatio }}>
              <img ref={imageRef} src={previewUrl!} alt="Preview" className={`w-full h-full object-cover ${filter}`} draggable="false" />
              {textOverlay && (
                <div onPointerDown={(e) => handleDragStart(e, 'text')} onPointerMove={handleDragMove} onPointerUp={handleDragEnd} onPointerLeave={handleDragEnd} onTouchStart={(e) => handleTouchStart(e, 'text')} onTouchMove={(e) => handleTouchMove(e, 'text')} onTouchEnd={handleTouchEnd}
                    className="absolute cursor-move p-2"
                    style={{ color: textOverlay.color, fontFamily: textOverlay.fontFamily, fontSize: `${textOverlay.size}px`, left: textOverlay.x, top: textOverlay.y, transform: 'translate(-50%, -50%)', textShadow: '0 0 8px black' }}>{textOverlay.text}</div>)}
              {emojiOverlay && (
                <div onPointerDown={(e) => handleDragStart(e, 'emoji')} onPointerMove={handleDragMove} onPointerUp={handleDragEnd} onPointerLeave={handleDragEnd} onTouchStart={(e) => handleTouchStart(e, 'emoji')} onTouchMove={(e) => handleTouchMove(e, 'emoji')} onTouchEnd={handleTouchEnd}
                     className="absolute cursor-move" style={{ fontSize: `${emojiOverlay.size}px`, left: emojiOverlay.x, top: emojiOverlay.y, transform: 'translate(-50%, -50%)', textShadow: '0 0 8px black' }}>{emojiOverlay.emoji}</div>)}
            </div>
            <div className="space-y-4">
              <div className="flex justify-around bg-white/5 p-2 rounded-lg">
                <button onClick={() => {setShowTextEditor(!showTextEditor); setShowEmojiPicker(false); if (!textOverlay) {setTextOverlay({text: 'Seu Texto', color:'#FFFFFF', fontFamily:'Inter', size: 48, x: 150, y: 150});} else {setTextOverlay(null);}}} className="p-2 hover:bg-white/10 rounded-full"><IconType/></button>
                <button onClick={() => {setShowEmojiPicker(!showEmojiPicker); setShowTextEditor(false); if (!emojiOverlay) {setEmojiOverlay({emoji: '😂', size: 100, x:150, y: 150});} else {setEmojiOverlay(null)}}} className="p-2 hover:bg-white/10 rounded-full"><IconSmile/></button>
              </div>

              {showTextEditor && textOverlay && ( <div className="space-y-2 bg-white/5 p-3 rounded-lg">
                  <input type="text" placeholder="Adicionar texto..." value={textOverlay.text} onChange={(e) => setTextOverlay(p => p? {...p, text: e.target.value} : null)} className="w-full bg-white/10 p-2 rounded-lg"/>
                  <div className="flex gap-2 items-center">
                    <select onChange={(e) => setTextOverlay(p => p? {...p, fontFamily: e.target.value} : null)} value={textOverlay.fontFamily} className="flex-grow bg-white/10 p-2 rounded-lg appearance-none text-center">
                        {FONT_FACES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input type="color" value={textOverlay.color} onChange={(e) => setTextOverlay(p => p? {...p, color: e.target.value} : null)} className="bg-transparent w-10 h-10"/>
                  </div>
                  <div className="flex gap-1 justify-center">{COLOR_SWATCHES.map(c => <button key={c} onClick={()=>setTextOverlay(p=>p?{...p, color:c}:null)} className="w-6 h-6 rounded-full" style={{backgroundColor:c}}/>)}</div>
              </div>)}
              {showEmojiPicker && emojiOverlay && ( <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-lg">{EMOJIS.map(e => <button key={e} onClick={() => setEmojiOverlay(p => p?{...p, emoji: e}:null)} className="text-3xl p-1 hover:bg-white/10 rounded-lg">{e}</button>)}</div> )}

              <div> <h4 className="font-semibold mb-2">Proporção</h4> <div className="flex gap-2"> {(['1/1', '4/5', '16/9'] as AspectRatio[]).map(ar => <button key={ar} onClick={() => setAspectRatio(ar)} className={`flex-1 p-2 rounded-lg ${aspectRatio === ar ? 'bg-indigo-600' : 'bg-white/10'}`}>{ar}</button>)} </div> </div>
              <div> <h4 className="font-semibold mb-2">Filtros</h4> <div className="flex gap-2 overflow-x-auto pb-2"> {FILTERS.map(f => <button key={f.name} onClick={() => setFilter(f.className)} className="text-center space-y-1"><div className={`w-16 h-16 rounded-lg bg-gray-500 ${f.className} ${filter === f.className ? 'ring-2 ring-indigo-500' : ''}`}></div><span className="text-xs">{f.name}</span></button>)} </div> </div>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep('upload')} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Voltar</button>
              <button onClick={processAndFinalize} disabled={isProcessing} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold">{isProcessing ? 'Processando...' : 'Próximo'}</button>
            </div>
          </div> );
      case 'finalize': return (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2"> <img src={previewUrl!} alt="Final Preview" className="w-full h-auto object-contain rounded-lg" /> </div>
            <div className="w-full sm:w-1/2 space-y-4">
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva uma legenda..." className="w-full h-32 p-3 bg-white/5 text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors" />
              <button type="button" onClick={handleGenerateCaption} disabled={isProcessing} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 rounded-lg font-semibold transition-colors disabled:bg-purple-800/50">
                {isProcessing ? <LoadingSpinner /> : <IconSparkles className="w-5 h-5" />} <span>{isProcessing ? 'Gerando...' : 'Gerar Legenda com IA'}</span>
              </button>
              <button type="submit" disabled={!caption || isProcessing} className="w-full px-4 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-bold text-lg transition-all disabled:from-gray-600 disabled:cursor-not-allowed"> Postar </button>
            </div>
          </div> );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in" onClick={handleOverlayClick}>
      <div ref={modalRef} className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto transform scale-95 transition-all duration-300" style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}>
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"><IconX className="w-6 h-6" /></button>
          <form onSubmit={handleSubmit}> {renderContent()} </form>
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        </div>
      </div>
       <style>{` @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; } @keyframes fadeInUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } } .select-none { user-select: none; } .touch-none { touch-action: none; } `}</style>
    </div>
  );
};