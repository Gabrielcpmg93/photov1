
import React from 'react';
import { PostCard } from './PostCard';
import type { Post, UserProfile } from '../types';

interface FeedProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  currentUser: UserProfile | null;
  onDeletePost: (postId: string, imageUrl: string) => void;
  onToggleLike: (postId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ posts, onPostClick, currentUser, onDeletePost, onToggleLike }) => {
  return (
    <>
      {posts.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-400">Nenhuma postagem ainda.</h2>
          <p className="text-gray-500 mt-2">Seja o primeiro a compartilhar uma foto!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onClick={onPostClick} 
              currentUser={currentUser}
              onDeletePost={onDeletePost}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </>
  );
};
