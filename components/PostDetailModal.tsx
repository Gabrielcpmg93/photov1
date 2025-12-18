
import React, { useState, useRef, useEffect } from 'react';
import type { Post } from '../types';
import { IconX, IconHeart, IconMessageCircle } from './Icons';

interface PostDetailModalProps {
  post: Post | null;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose, onToggleLike, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [post]);
  
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && post) {
      onAddComment(post.id, newComment.trim());
      setNewComment('');
    }
  };

  if (!post) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in-up"
      >
        <div className="w-full md:w-2/3 bg-black overflow-auto">
          <img src={post.imageUrl} alt={post.caption} className="w-full h-auto block" />
        </div>
        <div className="w-full md:w-1/3 flex flex-col bg-gray-800">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <img src={post.user.avatarUrl} alt={post.user.name} className="w-10 h-10 rounded-full mr-3" />
              <span className="font-bold">{post.user.name}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <IconX className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-gray-300">{post.caption}</p>
            <hr className="border-gray-700" />
            <div className="space-y-4">
              {post.commentList && post.commentList.length > 0 ? (
                post.commentList.map(comment => (
                  <div key={comment.id} className="flex items-start">
                    <img src={comment.user.avatarUrl} alt={comment.user.name} className="w-8 h-8 rounded-full mr-3 mt-1" />
                    <div>
                      <span className="font-bold text-sm">{comment.user.name}</span>
                      <p className="text-sm text-gray-300">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum comentário ainda.</p>
              )}
            </div>
            <div ref={commentsEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center space-x-4 mb-2">
              <button onClick={() => onToggleLike(post.id)} className="flex items-center space-x-2 group focus:outline-none">
                <IconHeart 
                  className={`w-7 h-7 transition-colors transform group-hover:scale-110 ${post.liked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}`} 
                  fill={post.liked ? 'currentColor' : 'none'}
                />
                 <span className="font-semibold">{post.likes}</span>
              </button>
              <div className="flex items-center space-x-2">
                <IconMessageCircle className="w-7 h-7 text-gray-400" />
                <span className="font-semibold">{post.comments}</span>
              </div>
            </div>
            <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="w-full bg-gray-700 border-gray-600 rounded-full py-2 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button type="submit" disabled={!newComment.trim()} className="text-indigo-400 font-semibold hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Postar
              </button>
            </form>
          </div>
        </div>
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
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
