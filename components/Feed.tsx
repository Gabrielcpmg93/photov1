
import React from 'react';
import { PostCard } from './PostCard';
import type { Post, UserProfile } from '../types';

interface FeedProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  currentUser: UserProfile | null;
  onDeletePost: (postId: string, imageUrl: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ posts, onPostClick, currentUser, onDeletePost, onToggleLike, onToggleSave }) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {posts.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-400">Nenhuma postagem ainda.</h2>
          <p className="text-gray-500 mt-2">Seja o primeiro a compartilhar uma foto!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onClick={onPostClick} 
              currentUser={currentUser}
              onDeletePost={onDeletePost}
              onToggleLike={onToggleLike}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
};
