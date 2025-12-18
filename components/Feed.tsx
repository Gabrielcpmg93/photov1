
import React from 'react';
import { PostCard } from './PostCard';
import type { Post } from '../types';

interface FeedProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const Feed: React.FC<FeedProps> = ({ posts, onPostClick }) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-gray-400">Nenhuma postagem ainda.</h2>
        <p className="text-gray-500 mt-2">Seja o primeiro a compartilhar uma foto!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {posts.map(post => (
        <PostCard key={post.id} post={post} onClick={onPostClick} />
      ))}
    </div>
  );
};
