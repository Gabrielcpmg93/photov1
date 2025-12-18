
import React, { useRef } from 'react';
import type { AppSettings } from '../types';
import { IconX } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const Toggle: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between py-3">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <button onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);


export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  const handleSettingChange = (key: keyof AppSettings, value: boolean) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h2>
             <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <IconX className="w-6 h-6" />
             </button>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <Toggle label="Modo Noturno" enabled={settings.darkMode} onChange={(val) => handleSettingChange('darkMode', val)} />
            <Toggle label="Notificações por E-mail" enabled={settings.emailNotifications} onChange={(val) => handleSettingChange('emailNotifications', val)} />
            <Toggle label="Notificações Push" enabled={settings.pushNotifications} onChange={(val) => handleSettingChange('pushNotifications', val)} />
          </div>

          <div className="mt-8 text-center">
            <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors">
              Fechar
            </button>
          </div>
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
