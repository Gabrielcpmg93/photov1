
import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Post, Comment as CommentType } from '../types';
import { IconX, IconSettings, IconPlusCircle, IconHeart, IconMessageCircle, IconCamera } from './Icons';
import { ProfilePostThumbnail } from './ProfilePostThumbnail';
import * as db from '../services/supabaseService';
import { supabase } from '../services/supabaseService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  userPosts: Post[];
  onUpdateProfile: (newProfile: Pick<UserProfile, 'name' | 'bio'>) => void;
  onUpdateProfilePicture: (file: File) => void;
  onOpenSettings: () => void;
  onStartStoryCreation: (storyFile: File) => void;
  onOpenStoryViewer: () => void;
  onSelectPost: (post: Post) => void;
  onDeletePost: (postId: string, imageUrl: string) => void;
}

type ActiveTab = 'posts' | 'performance';
type Activity = { type: 'comment', data: CommentType, post: Post };

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
    isOpen, 
    onClose, 
    userProfile, 
    userPosts, 
    onUpdateProfile,
    onUpdateProfilePicture,
    onOpenSettings, 
    onStartStoryCreation, 
    onOpenStoryViewer,
    onSelectPost,
    onDeletePost
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name ?? '');
  const [bio, setBio] = useState(userProfile?.bio ?? '');
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts');
  const [isUploading, setIsUploading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (userProfile) {
        setName(userProfile.name);
        setBio(userProfile.bio);
      }
      setActiveTab('posts'); // Reset to default tab on open
      setActivityFeed([]); // Clear activity on open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setIsEditing(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, userProfile]);
  
  // Real-time activity feed effect
  useEffect(() => {
    if (activeTab !== 'performance' || !isOpen || !userProfile) {
      return;
    }

    const userPostIds = userPosts.map(p => p.id);
    if (userPostIds.length === 0) return;

    const channel = supabase.channel('public:comments-profile')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=in.(${userPostIds.join(',')})` 
        },
        (payload) => {
          // Filter out own comments
          if (payload.new.user_name === userProfile.name) {
            return;
          }
          const newComment = db.formatComment(payload.new);
          const post = userPosts.find(p => p.id === newComment.post_id);
          if (post) {
            setActivityFeed(prevFeed => [{
              type: 'comment',
              data: newComment,
              post: post,
            }, ...prevFeed].slice(0, 20)); // Keep feed to a reasonable size
          }
        }
      ).subscribe();
    
    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };

  }, [activeTab, isOpen, userPosts, userProfile]);

  const handleSave = () => {
    onUpdateProfile({ name, bio });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    if (userProfile) {
      setName(userProfile.name);
      setBio(userProfile.bio);
    }
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

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      await onUpdateProfilePicture(file);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  if (!userProfile) {
    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
            onClick={handleOverlayClick}
        >
            <div 
                ref={modalRef}
                className="bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center flex flex-col items-center"
            >
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-lg font-semibold text-gray-300">Carregando perfil...</p>
            </div>
        </div>
    );
  }

  const hasStory = !!userProfile.stories && userProfile.stories.length > 0;
  const totalPosts = userPosts.length;
  const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = userPosts.reduce((sum, post) => sum + post.comments, 0);

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 animate-fade-in-up"
      >
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold">Seu Perfil</h2>
             <div className="flex items-center space-x-2">
                <button onClick={onOpenSettings} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                    <IconSettings className="w-6 h-6" />
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                    <IconX className="w-6 h-6" />
                </button>
             </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <button
                  onClick={hasStory ? onOpenStoryViewer : () => storyInputRef.current?.click()}
                  className={`p-1 rounded-full ${hasStory ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'border-2 border-dashed border-gray-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all`}
                  disabled={isEditing}
              >
                  <div className="p-1 bg-gray-800 rounded-full">
                      <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-24 h-24 rounded-full" />
                  </div>
              </button>
              {isEditing ? (
                  <>
                    <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-2 border-4 border-gray-800 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transform hover:scale-110 transition-transform"
                        aria-label="Mudar foto do perfil"
                    >
                        {isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <IconCamera className="w-5 h-5" />}
                    </button>
                    <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                  </>
              ) : (
                <>
                  <button
                      onClick={() => storyInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-1 border-2 border-gray-800 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transform hover:scale-110 transition-transform"
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
                </>
              )}
            </div>

            {isEditing ? (
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full text-center text-2xl font-bold bg-white/5 border border-white/10 text-white rounded-lg p-2 mb-2 focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <h3 className="text-2xl font-bold">{userProfile.name}</h3>
            )}
            
            {isEditing ? (
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                className="w-full text-center text-gray-300 bg-white/5 border border-white/10 rounded-lg p-2 mt-2 focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                rows={3}
              />
            ) : (
              <p className="text-gray-400 mt-2">{userProfile.bio}</p>
            )}

            <div className="mt-6 w-full space-y-2 sm:space-y-0 sm:flex sm:space-x-4">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave} 
                    className="w-full sm:w-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
                  >
                    Salvar
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className="w-full sm:w-1/2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors"
                >
                  Editar Perfil
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto mt-6">
          <div className="border-b border-white/10 px-6">
              <nav className="flex space-x-4">
                  <button 
                      onClick={() => setActiveTab('posts')}
                      className={`px-3 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'posts' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      Postagens
                  </button>
                  <button 
                      onClick={() => setActiveTab('performance')}
                      className={`px-3 py-2 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'performance' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      Desempenho
                  </button>
              </nav>
          </div>
          <div className="p-6">
            {activeTab === 'posts' && (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map(post => (
                  <ProfilePostThumbnail 
                    key={post.id} 
                    post={post} 
                    onClick={() => onSelectPost(post)} 
                    onDelete={onDeletePost}
                  />
                ))}
              </div>
            )}
            {activeTab === 'performance' && (
               <div>
                 <div className="space-y-3">
                    <div className="flex items-center p-3 bg-white/5 rounded-lg">
                        <div className="p-3 bg-indigo-500/80 rounded-lg mr-4">
                            <IconCamera className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{totalPosts}</p>
                            <p className="text-sm text-gray-400">Total de Postagens</p>
                        </div>
                    </div>
                    <div className="flex items-center p-3 bg-white/5 rounded-lg">
                        <div className="p-3 bg-red-500/80 rounded-lg mr-4">
                            <IconHeart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{totalLikes}</p>
                            <p className="text-sm text-gray-400">Total de Curtidas</p>
                        </div>
                    </div>
                    <div className="flex items-center p-3 bg-white/5 rounded-lg">
                        <div className="p-3 bg-blue-500/80 rounded-lg mr-4">
                            <IconMessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{totalComments}</p>
                            <p className="text-sm text-gray-400">Total de Comentários</p>
                        </div>
                    </div>
                 </div>

                 <div className="mt-6 border-t border-white/10 pt-4">
                    <h4 className="text-md font-semibold text-gray-300 mb-2">Atividade em Tempo Real</h4>
                    {activityFeed.length > 0 ? (
                      <ul className="space-y-4 max-h-48 overflow-y-auto pr-2">
                        {activityFeed.map(activity => (
                          <li key={activity.data.id} className="flex items-start space-x-3 text-sm animate-fade-in">
                            <img src={activity.data.user.avatarUrl} className="w-8 h-8 rounded-full flex-shrink-0" alt={activity.data.user.name} />
                            <div className="flex-1">
                              <p className="text-gray-300">
                                <span className="font-bold text-white">{activity.data.user.name}</span>
                                {' comentou: "'}
                                <span className="italic text-gray-400 line-clamp-1">{activity.data.text}</span>
                                {'"'}
                              </p>
                            </div>
                            <img src={activity.post.imageUrl} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="post thumbnail" />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Aguardando novas atividades...</p>
                    )}
                    <p className="text-xs text-gray-600 mt-4 text-center">Apenas comentários de outros usuários são exibidos. O rastreamento de curtidas e compartilhamentos não está disponível no momento.</p>
                 </div>
               </div>
            )}
          </div>
        </div>

      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
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
