
import React from 'react';
import type { Post } from '../types';
import { IconHeart, IconMessageCircle } from './Icons';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  return (
    <button
      onClick={() => onClick(post)}
      className="group relative text-left w-full overflow-hidden rounded-xl shadow-lg bg-white dark:bg-gray-800 break-inside-avoid-column transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
    >
      <img
        src={post.imageUrl}
        alt={post.caption}
        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute bottom-0 left-0 p-4 w-full text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
        <div className="flex items-center mb-2">
          <img
            src={post.user.avatarUrl}
            alt={post.user.name}
            className="w-8 h-8 rounded-full border-2 border-gray-400 mr-2"
          />
          <span className="font-bold text-sm">{post.user.name}</span>
        </div>
        <p className="text-sm text-gray-200 mb-3 line-clamp-2">{post.caption}</p>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <IconHeart className="w-4 h-4 text-red-500" fill="currentColor" />
            <span>{post.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <IconMessageCircle className="w-4 h-4 text-blue-400" />
            <span>{post.comments}</span>
          </div>
        </div>
      </div>
    </button>
  );
};
