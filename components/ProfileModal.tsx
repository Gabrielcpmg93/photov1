
import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Post } from '../types';
import * as startioApi from '../services/startioApiClient';
import { IconX, IconSettings, IconCamera, IconBookmark, IconDollarSign, IconTrendingUp } from './Icons';
import { ProfilePostThumbnail } from './ProfilePostThumbnail';
import { PerformanceDashboard } from './PerformanceDashboard';
import { LoadingSpinner } from './LoadingSpinner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  userPosts: Post[];
  savedPosts: Post[];
  onUpdateProfile: (newProfile: Pick<UserProfile, 'name' | 'bio'>) => void;
  onUpdateProfilePicture: (file: File) => void;
  onOpenSettings: () => void;
  onStartStoryCreation: (storyFile: File) => void;
  onOpenStoryViewer: () => void;
  onSelectPost: (post: Post) => void;
  onDeletePost: (postId: string, imageUrl: string) => void;
  onUpdateMonetizationStatus: (isMonetized: boolean) => void;
  onTogglePostMonetization: (postId: string, isMonetized: boolean) => void;
  onUpdateStartioId: (startioId: string) => void;
}

type ActiveTab = 'posts' | 'saved' | 'performance' | 'monetization';

const Toggle: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 ${enabled ? 'bg-indigo-600' : 'bg-gray-600'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
    isOpen, onClose, userProfile, userPosts, savedPosts,
    onUpdateProfile, onUpdateProfilePicture, onOpenSettings, 
    onSelectPost, onDeletePost,
    onUpdateMonetizationStatus, onTogglePostMonetization, onUpdateStartioId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name ?? '');
  const [bio, setBio] = useState(userProfile?.bio ?? '');
  const [startioId, setStartioId] = useState(userProfile?.startio_app_id ?? '');
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts');
  const [isUploading, setIsUploading] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (userProfile) { setName(userProfile.name); setBio(userProfile.bio); setStartioId(userProfile.startio_app_id ?? ''); } }, [userProfile]);
  useEffect(() => { if (isOpen) { setActiveTab('posts'); document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'unset'; setIsEditing(false); } return () => { document.body.style.overflow = 'unset'; }; }, [isOpen]);
  
  const monetizedPostsCount = userPosts.filter(p => p.is_monetized).length;

  useEffect(() => {
    if (activeTab === 'monetization' && userProfile?.is_monetized) {
      const fetchEarnings = async () => {
        setIsLoadingEarnings(true);
        setEarningsError(null);
        const response = await startioApi.getStartioEarnings();
        if (response.success) {
          setTotalEarnings(response.earnings ?? 0);
        } else {
          setEarningsError(response.error ?? 'Ocorreu um erro desconhecido.');
          setTotalEarnings(0);
        }
        setIsLoadingEarnings(false);
      };
      fetchEarnings();
    }
  }, [activeTab, userProfile?.is_monetized, userProfile?.startio_app_id, monetizedPostsCount]);

  const handleSave = () => { onUpdateProfile({ name, bio }); setIsEditing(false); };
  const handleCancel = () => { if (userProfile) { setName(userProfile.name); setBio(userProfile.bio); } setIsEditing(false); };
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) { onClose(); } };
  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setIsUploading(true); await onUpdateProfilePicture(file); setIsUploading(false); }
  };
  const handleStartioSave = () => { onUpdateStartioId(startioId); alert('ID do Start.io salvo! Os ganhos serão atualizados.'); };

  if (!isOpen || !userProfile) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={handleOverlayClick}>
      <div ref={modalRef} className="bg-gray-800/50 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold">Seu Perfil</h2>
             <div className="flex items-center space-x-2">
                <button onClick={onOpenSettings} className="p-2 rounded-full hover:bg-white/10"><IconSettings className="w-6 h-6" /></button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><IconX className="w-6 h-6" /></button>
             </div>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
               <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-24 h-24 rounded-full" />
               {isEditing && ( <> <button onClick={() => avatarInputRef.current?.click()} disabled={isUploading} className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-2 border-4 border-gray-800">{isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <IconCamera className="w-5 h-5" />}</button> <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden" /> </>)}
            </div>
            {isEditing ? <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full text-center text-2xl font-bold bg-white/5 border rounded-lg p-2 mb-2" /> : <h3 className="text-2xl font-bold">{userProfile.name}</h3>}
            {isEditing ? <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full text-center text-gray-300 bg-white/5 border rounded-lg p-2 mt-2" rows={3} /> : <p className="text-gray-400 mt-2">{userProfile.bio}</p>}
            <div className="mt-6 w-full space-y-2 sm:space-y-0 sm:flex sm:space-x-4">
              {isEditing ? ( <> <button onClick={handleSave} className="w-full sm:w-1/2 px-4 py-2 bg-indigo-600 rounded-lg font-semibold">Salvar</button> <button onClick={handleCancel} className="w-full sm:w-1/2 px-4 py-2 bg-gray-600 rounded-lg font-semibold">Cancelar</button> </> ) : <button onClick={() => setIsEditing(true)} className="w-full px-4 py-2 bg-white/10 rounded-lg font-semibold">Editar Perfil</button>}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto mt-6">
          <div className="border-b border-white/10 px-6"><nav className="flex space-x-2 sm:space-x-4 overflow-x-auto text-sm">
            {[{key: 'posts', icon: IconCamera}, {key: 'saved', icon: IconBookmark}, {key: 'performance', icon: IconTrendingUp}, {key: 'monetization', icon: IconDollarSign}].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as ActiveTab)} className={`flex items-center space-x-2 px-3 py-2 font-semibold rounded-t-lg capitalize whitespace-nowrap ${activeTab === tab.key ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                <tab.icon className="w-5 h-5" /> <span>{tab.key}</span>
              </button>
            ))}
          </nav></div>
          <div className="p-6">
            {activeTab === 'posts' && <div className="grid grid-cols-3 gap-1">{userPosts.map(post => <ProfilePostThumbnail key={post.id} post={post} onClick={() => onSelectPost(post)} onDelete={onDeletePost} />)}</div>}
            {activeTab === 'saved' && <div className="grid grid-cols-3 gap-1">{savedPosts.map(post => <ProfilePostThumbnail key={post.id} post={post} onClick={() => onSelectPost(post)} onDelete={onDeletePost} showDeleteButton={false}/>)}</div>}
            {activeTab === 'performance' && <PerformanceDashboard posts={userPosts} />}
            {activeTab === 'monetization' && (<div>
              {!userProfile.is_monetized ? (
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <IconDollarSign className="w-16 h-16 mx-auto text-green-400 mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Monetize seu Talento</h3>
                  <p className="text-gray-400 mb-6">Ganhe dinheiro com suas fotos. Junte-se ao nosso programa de parceiros para começar.</p>
                  <button onClick={() => onUpdateMonetizationStatus(true)} className="px-8 py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-bold rounded-lg transition-transform transform hover:scale-105">Tornar-se Parceiro</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-400 text-sm">Ganhos Totais (Start.io)</p>
                    <div className="text-4xl font-bold text-green-400 h-12 flex items-center">
                      {isLoadingEarnings ? (
                        <LoadingSpinner />
                      ) : earningsError ? (
                        <span className="text-base font-semibold text-red-400">{earningsError}</span>
                      ) : (
                        `R$ ${totalEarnings.toFixed(2).replace('.', ',')}`
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div><p className="font-bold text-lg">{monetizedPostsCount}</p><p className="text-xs text-gray-400">Fotos Monetizadas</p></div>
                    <div><p className="font-bold text-lg">15/07</p><p className="text-xs text-gray-400">Próximo Pagamento</p></div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Gerenciar Monetização de Posts</h4>
                    <ul className="space-y-3 max-h-40 overflow-y-auto pr-2">{userPosts.map(post => (<li key={post.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg"><div className="flex items-center space-x-3"><img src={post.imageUrl} alt="" className="w-12 h-12 object-cover rounded-md" /><div><p className="text-sm font-semibold truncate max-w-xs">{post.caption}</p><p className="text-xs text-green-400">Ganhos: R$ {(post.earnings || 0).toFixed(2).replace('.', ',')}</p></div></div><Toggle enabled={post.is_monetized || false} onChange={(val) => onTogglePostMonetization(post.id, val)} /></li>))}</ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Integração Start.io</h4>
                    <div className="space-y-2">
                        <label htmlFor="startioId" className="text-sm font-medium text-gray-300">Seu Start.io App ID</label>
                        <input id="startioId" type="text" value={startioId} onChange={(e) => setStartioId(e.target.value)} placeholder="Seu App ID do Start.io" className="w-full p-2 bg-white/5 border border-white/10 rounded-lg" />
                        <button onClick={handleStartioSave} className="w-full px-4 py-2 bg-indigo-600 rounded-lg font-semibold">Salvar ID</button>
                    </div>
                  </div>
                </div>
              )}
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
};
