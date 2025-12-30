
import React from 'react';
import type { Post } from '../types';
import { IconHeart, IconMessageCircle, IconTrash } from './Icons';

interface ProfilePostThumbnailProps {
  post: Post;
  onClick: () => void;
  onDelete: (postId: string, imageUrl: string) => void;
}

export const ProfilePostThumbnail: React.FC<ProfilePostThumbnailProps> = ({ post, onClick, onDelete }) => {
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick for the thumbnail
    onDelete(post.id, post.imageUrl);
  };

  return (
    <div
      className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-md"
      onClick={onClick}
    >
      <img
        src={post.imageUrl}
        alt={post.caption}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex h-full w-full items-center justify-center space-x-4 text-white">
          <div className="flex items-center space-x-1">
            <IconHeart className="h-5 w-5" fill="white" />
            <span className="font-bold">{post.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <IconMessageCircle className="h-5 w-5" />
            <span className="font-bold">{post.comments}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handleDeleteClick}
        className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/50 p-1.5 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
        aria-label="Excluir postagem"
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  );
};
