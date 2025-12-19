
import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Post } from '../types';
import { IconX, IconSettings, IconPlusCircle, IconHeart, IconMessageCircle, IconTrash } from './Icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  userPosts: Post[];
  onUpdateProfile: (newProfile: Pick<UserProfile, 'name' | 'bio'>) => void;
  onOpenSettings: () => void;
  onStartStoryCreation: (storyFile: File) => void;
  onOpenStoryViewer: () => void;
  onSelectPost: (post: Post) => void;
  onDeletePost: (postId: string, imageUrl: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userProfile, userPosts, onUpdateProfile, onOpenSettings, onStartStoryCreation, onOpenStoryViewer, onSelectPost, onDeletePost }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);
  const modalRef = useRef<HTMLDivElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(userProfile.name);
      setBio(userProfile.bio);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, userProfile]);
  
  const handleSave = () => {
    onUpdateProfile({ name, bio });
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

  const handleStoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onStartStoryCreation(file);
    }
  };
  
  const handleDelete = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    onDeletePost(post.id, post.imageUrl);
  };

  const hasStory = !!userProfile.stories && userProfile.stories.length > 0;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 pb-0">
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
            <div className="relative mb-4">
              <button
                  onClick={hasStory ? onOpenStoryViewer : () => storyInputRef.current?.click()}
                  className={`p-1 rounded-full ${hasStory ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : ''} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-purple-500`}
              >
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-full">
                      <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-24 h-24 rounded-full" />
                  </div>
              </button>
              <button
                  onClick={() => storyInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-1 border-2 border-white dark:border-gray-800 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                  aria-label="Adicionar story"
              >
                  <IconPlusCircle className="w-6 h-6" strokeWidth={2} />
              </button>
              <input
                  type="file"
                  ref={storyInputRef}
                  onChange={handleStoryFileChange}
                  accept="image/*"
                  className="hidden"
              />
            </div>

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
        
        <div className="flex-1 overflow-y-auto mt-6 p-6 pt-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700 pt-4">Postagens</h3>
            {userPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 mt-4">
                    {userPosts.map(post => (
                    <div key={post.id} className="aspect-square relative group bg-gray-200 dark:bg-gray-700 rounded-sm">
                        <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                        <div onClick={() => onSelectPost(post)} className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity text-white cursor-pointer group-hover:bg-black/60 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                    <IconHeart className="w-4 h-4" fill="white" />
                                    <span>{post.likes}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <IconMessageCircle className="w-4 h-4" />
                                    <span>{post.comments}</span>
                                </div>
                            </div>
                        </div>
                         <button 
                            onClick={(e) => handleDelete(e, post)}
                            className="absolute top-1 right-1 z-10 p-1.5 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Excluir postagem"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                    </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 mt-4">Nenhuma postagem ainda.</p>
            )}
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
