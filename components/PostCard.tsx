
import React from 'react';
import type { Post, UserProfile } from '../types';
import { IconHeart, IconMessageCircle, IconTrash } from './Icons';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
  currentUser: UserProfile | null;
  onDeletePost: (postId: string, imageUrl: string) => void;
  onToggleLike?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick, currentUser, onDeletePost, onToggleLike }) => {
  const isOwner = currentUser && currentUser.id === post.user_id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePost(post.id, post.imageUrl);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike(post.id);
    }
  };

  return (
    <div
      className="group relative text-white w-full aspect-[4/5] overflow-hidden rounded-2xl shadow-lg bg-gray-800 transform transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1"
      onClick={() => onClick(post)}
    >
      <img
        src={post.imageUrl}
        alt={post.caption}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
      
      {isOwner && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 z-10 p-2 bg-black/40 rounded-full text-white/80 hover:bg-red-500 hover:text-white transition-colors"
          aria-label="Excluir postagem"
        >
          <IconTrash className="w-5 h-5" />
        </button>
      )}

      <div className="relative h-full flex flex-col justify-end p-4 cursor-pointer">
        <div 
          className="flex-grow" // This element will push content to the bottom
          onClick={() => onClick(post)} 
        />
        
        <div className="flex items-center mb-2">
            <img
                src={post.user.avatarUrl}
                alt={post.user.name}
                className="w-9 h-9 rounded-full border-2 border-white/50 mr-3"
            />
            <span className="font-bold text-sm text-white drop-shadow-md">{post.user.name}</span>
        </div>

        <p className="text-sm text-white/90 mb-3 line-clamp-2 drop-shadow-md">
          {post.caption}
        </p>
        
        <div className="flex items-center space-x-4 text-white/80 border-t border-white/20 pt-3">
          <button onClick={handleLike} className="flex items-center space-x-1.5 group/like focus:outline-none transition-transform transform hover:scale-105">
            <IconHeart 
              className={`w-6 h-6 transition-colors ${post.liked ? 'text-red-500' : 'text-white/80 group-hover/like:text-white'}`} 
              fill={post.liked ? 'currentColor' : 'none'}
            />
            <span className="font-semibold text-sm">{post.likes}</span>
          </button>
          <div className="flex items-center space-x-1.5">
            <IconMessageCircle className="w-6 h-6" />
            <span className="font-semibold text-sm">{post.comments}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
