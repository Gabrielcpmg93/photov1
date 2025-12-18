
import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../types';
import { IconX, IconSettings } from './Icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (newProfile: UserProfile) => void;
  onOpenSettings: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userProfile, onUpdateProfile, onOpenSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(userProfile.name);
      setBio(userProfile.bio);
    }
  }, [isOpen, userProfile]);
  
  const handleSave = () => {
    onUpdateProfile({ ...userProfile, name, bio });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setName(userProfile.name);
    setBio(userProfile.bio);
    setIsEditing(false);
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 relative">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Seu Perfil</h2>
             <div className="flex items-center space-x-2">
                <button onClick={onOpenSettings} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <IconSettings className="w-6 h-6" />
                </button>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <IconX className="w-6 h-6" />
                </button>
             </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-24 h-24 rounded-full mb-4 border-4 border-gray-300 dark:border-gray-600" />
            
            {isEditing ? (
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full text-center text-2xl font-bold bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2 mb-2 focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{userProfile.name}</h3>
            )}
            
            {isEditing ? (
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                className="w-full text-center text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 mt-2 focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mt-2">{userProfile.bio}</p>
            )}

            <div className="mt-6 w-full space-y-2 sm:space-y-0 sm:flex sm:space-x-4">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave} 
                    className="w-full sm:w-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors"
                  >
                    Salvar
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className="w-full sm:w-1/2 px-4 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 rounded-lg text-white font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold transition-colors"
                >
                  Editar Perfil
                </button>
              )}
            </div>
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
