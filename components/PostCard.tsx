
import React, { useState } from 'react';
import type { Post, UserProfile } from '../types';
import { IconHeart, IconMessageCircle, IconTrash, IconBookmark, IconShare } from './Icons';
import { TranslationMenu } from './TranslationMenu';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
  currentUser: UserProfile | null;
  onDeletePost: (postId: string, imageUrl: string) => void;
  onToggleLike?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick, currentUser, onDeletePost, onToggleLike, onToggleSave }) => {
  const isOwner = currentUser && currentUser.id === post.user_id;
  const [translatedCaption, setTranslatedCaption] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePost(post.id, post.imageUrl);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLike?.(post.id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.(post.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = encodeURIComponent(`Confira esta postagem de ${post.user.name}:\n\n"${post.caption}"\n\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: (e: React.MouseEvent) => void; isActive?: boolean }> = ({ icon, label, onClick, isActive }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-white/10 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-300'}`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg w-full overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src={post.user.avatarUrl}
            alt={post.user.name}
            className="w-10 h-10 rounded-full border-2 border-white/20"
          />
          <div>
            <p className="font-bold text-white">{post.user.name}</p>
            {post.created_at && <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</p>}
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            aria-label="Excluir postagem"
          >
            <IconTrash className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Post Caption */}
      <div className="px-4 pb-3 relative">
        <p className="text-white/90 whitespace-pre-wrap pr-8">
          {isTranslating ? 'Traduzindo...' : (translatedCaption || post.caption)}
        </p>
         {translatedCaption && (
            <button onClick={(e) => { e.stopPropagation(); setTranslatedCaption(null); }} className="text-xs text-indigo-300 hover:underline mt-1">Mostrar original</button>
        )}
        <TranslationMenu
            textToTranslate={post.caption}
            onTranslateStart={() => setIsTranslating(true)}
            onTranslateComplete={(translatedText) => {
                setTranslatedCaption(translatedText);
                setIsTranslating(false);
            }}
            buttonClassName="absolute top-0 right-3"
        />
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="bg-black cursor-pointer" onClick={() => onClick(post)}>
            <img
            src={post.imageUrl}
            alt={post.caption}
            className="w-full max-h-[75vh] object-contain"
            loading="lazy"
            />
        </div>
      )}

      {/* Post Stats */}
      <div className="px-4 py-2 flex justify-between items-center text-gray-400 text-sm border-b border-t border-white/10">
        <div>
          {post.likes > 0 && <span>{post.likes} {post.likes === 1 ? 'curtida' : 'curtidas'}</span>}
        </div>
        <div>
           {post.comments > 0 && <span className="cursor-pointer hover:underline" onClick={() => onClick(post)}>{post.comments} {post.comments === 1 ? 'comentário' : 'comentários'}</span>}
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-2 py-1 flex justify-around">
        <ActionButton
          icon={<IconHeart className={`w-5 h-5 transition-colors ${post.liked ? 'fill-current' : ''}`} />}
          label="Curtir"
          onClick={handleLike}
          isActive={post.liked}
        />
        <ActionButton
          icon={<IconMessageCircle className="w-5 h-5" />}
          label="Comentar"
          onClick={() => onClick(post)}
        />
         <ActionButton
          icon={<IconShare className="w-5 h-5" />}
          label="Compartilhar"
          onClick={handleShare}
        />
         <ActionButton
          icon={<IconBookmark className={`w-5 h-5 transition-colors ${post.saved ? 'fill-current' : ''}`} />}
          label="Salvar"
          onClick={handleSave}
          isActive={post.saved}
        />
      </div>
    </div>
  );
};
