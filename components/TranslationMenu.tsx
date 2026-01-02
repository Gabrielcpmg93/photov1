
import React, { useState, useRef, useEffect } from 'react';
import { IconGlobe, IconX } from './Icons';
import { translateText } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface TranslationMenuProps {
    textToTranslate: string;
    onTranslateStart: () => void;
    onTranslateComplete: (translatedText: string) => void;
    buttonClassName?: string;
}

const LANGUAGES = [
    { code: 'en', name: 'Inglês' },
    { code: 'es', name: 'Espanhol' },
    { code: 'fr', name: 'Francês' },
    { code: 'pt', name: 'Português' },
];

export const TranslationMenu: React.FC<TranslationMenuProps> = ({ textToTranslate, onTranslateStart, onTranslateComplete, buttonClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTranslate = async (targetLanguage: string) => {
        setIsLoading(true);
        setError(null);
        onTranslateStart();
        try {
            const translated = await translateText(textToTranslate, targetLanguage);
            onTranslateComplete(translated);
        } catch (err) {
            setError('Falha na tradução.');
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };
    
    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    }

    return (
        <div className={`relative ${buttonClassName}`} ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="p-1.5 bg-black/20 rounded-full text-white/70 hover:bg-black/40 transition-colors"
                aria-label="Traduzir texto"
            >
                <IconGlobe className="w-4 h-4" />
            </button>
            {isOpen && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 animate-fade-in-up-fast"
                >
                    <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                        <h4 className="text-xs font-semibold text-white">Traduzir para</h4>
                         <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                            <IconX className="w-4 h-4" />
                         </button>
                    </div>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <LoadingSpinner />
                        </div>
                    ) : (
                         <ul className="py-1">
                            {LANGUAGES.map(lang => (
                                <li key={lang.code}>
                                    <button
                                        onClick={() => handleTranslate(lang.name)}
                                        className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-indigo-600 hover:text-white"
                                    >
                                        {lang.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {error && <p className="text-xs text-red-400 p-2">{error}</p>}
                </div>
            )}
            <style>{`
                 @keyframes fadeInUpFast {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up-fast { animation: fadeInUpFast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};
