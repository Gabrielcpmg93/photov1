
import React from 'react';
import type { Post, UserProfile } from '../types';
import { IconHeart, IconMessageCircle, IconTrash } from './Icons';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
  currentUser: UserProfile | null;
  onDeletePost: (postId: string, imageUrl: string) => void;
  // This prop is missing, but needed for the like button to work directly.
  // Assuming it will be passed down from App.tsx through Feed.tsx
  onToggleLike?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick, currentUser, onDeletePost, onToggleLike }) => {
  const isOwner = currentUser && currentUser.id === post.user_id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    onDeletePost(post.id, post.imageUrl);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    if (onToggleLike) {
      onToggleLike(post.id);
    }
  };

  return (
    <div
      className="group text-left w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-gray-800 break-inside-avoid-column transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col"
    >
      <div onClick={() => onClick(post)} className="relative cursor-pointer">
        {isOwner && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
            aria-label="Excluir postagem"
          >
            <IconTrash className="w-5 h-5" />
          </button>
        )}
        <img
          src={post.imageUrl}
          alt={post.caption}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center mb-3">
            <img
                src={post.user.avatarUrl}
                alt={post.user.name}
                className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-gray-600 mr-3"
            />
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{post.user.name}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 flex-grow cursor-pointer" onClick={() => onClick(post)}>
          {post.caption}
        </p>
        
        <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
          <button onClick={handleLike} className="flex items-center space-x-1 group/like focus:outline-none">
            <IconHeart 
              className={`w-6 h-6 transition-colors transform group-hover/like:scale-110 ${post.liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 group-hover/like:text-red-500'}`} 
              fill={post.liked ? 'currentColor' : 'none'}
            />
            <span className="font-semibold text-sm">{post.likes}</span>
          </button>
          <div onClick={() => onClick(post)} className="flex items-center space-x-1 cursor-pointer">
            <IconMessageCircle className="w-6 h-6" />
            <span className="font-semibold text-sm">{post.comments}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
