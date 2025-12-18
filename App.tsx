
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import type { Post, Comment, UserProfile, AppSettings } from './types';

// Add more posts to make the feed scrollable
const initialPosts: Post[] = [
  {
    id: '3',
    user: { name: 'viajante_sereno', avatarUrl: 'https://picsum.photos/id/1025/100/100' },
    imageUrl: 'https://picsum.photos/id/1015/800/1200',
    caption: 'Manhãs tranquilas junto ao lago. A natureza na sua forma mais pura.',
    likes: 5678,
    comments: 2,
    liked: false,
    commentList: [
      { id: 'c1', user: { name: 'explorador_urbano', avatarUrl: 'https://picsum.photos/id/1005/100/100' }, text: 'Que lugar incrível! Onde é?' },
      { id: 'c2', user: { name: 'chef_aventureiro', avatarUrl: 'https://picsum.photos/id/1011/100/100' }, text: 'A foto transmite uma paz imensa. Parabéns!' },
    ]
  },
  {
    id: '1',
    user: { name: 'explorador_urbano', avatarUrl: 'https://picsum.photos/id/1005/100/100' },
    imageUrl: 'https://picsum.photos/id/10/800/1000',
    caption: 'Explorando a cidade à noite. As luzes de néon contam uma história.',
    likes: 1024,
    comments: 88,
    liked: true,
    commentList: [],
  },
  {
    id: '2',
    user: { name: 'chef_aventureiro', avatarUrl: 'https://picsum.photos/id/1011/100/100' },
    imageUrl: 'https://picsum.photos/id/21/800/600',
    caption: 'A arte da massa fresca. Simples, mas divino.',
    likes: 2345,
    comments: 210,
    liked: false,
    commentList: [],
  },
  {
    id: '4',
    user: { name: 'arquiteto_visionario', avatarUrl: 'https://picsum.photos/id/1027/100/100' },
    imageUrl: 'https://picsum.photos/id/104/800/600',
    caption: 'Linhas que se encontram com o céu. A beleza da arquitetura moderna.',
    likes: 850,
    comments: 55,
    liked: false,
    commentList: [],
  },
  {
    id: '5',
    user: { name: 'explorador_urbano', avatarUrl: 'https://picsum.photos/id/1005/100/100' },
    imageUrl: 'https://picsum.photos/id/1040/800/1100',
    caption: 'Perdido nas montanhas, encontrado na vastidão.',
    likes: 12000,
    comments: 983,
    liked: false,
    commentList: [],
  },
  {
    id: '6',
    user: { name: 'viajante_sereno', avatarUrl: 'https://picsum.photos/id/1025/100/100' },
    imageUrl: 'https://picsum.photos/id/1059/800/900',
    caption: 'O farol, um guia constante na escuridão.',
    likes: 3300,
    comments: 198,
    liked: true,
    commentList: [],
  },
];

const initialProfile: UserProfile = {
  name: 'Seu Nome',
  avatarUrl: 'https://picsum.photos/seed/you/200/200',
  bio: 'Esta é a sua biografia! Clique em editar para alterá-la.',
};

const initialSettings: AppSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
};


function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  const openSettingsModal = useCallback(() => {
    closeProfileModal();
    setIsSettingsModalOpen(true);
  }, [closeProfileModal]);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);


  const handleSelectPost = useCallback((post: Post) => {
    const currentPost = posts.find(p => p.id === post.id) || post;
    setSelectedPost(currentPost);
  }, [posts]);

  const handleClosePostDetail = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const handleToggleLike = useCallback((postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const liked = !p.liked;
          const likes = liked ? p.likes + 1 : p.likes - 1;
          const updatedPost = { ...p, liked, likes };
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          return updatedPost;
        }
        return p;
      })
    );
  }, [selectedPost]);

  const handleAddComment = useCallback((postId: string, commentText: string) => {
    const newComment: Comment = {
      id: new Date().toISOString(),
      user: { name: userProfile.name, avatarUrl: userProfile.avatarUrl },
      text: commentText,
    };
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const newCommentList = [newComment, ...(p.commentList || [])];
          const updatedPost = { ...p, commentList: newCommentList, comments: newCommentList.length };
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          return updatedPost;
        }
        return p;
      })
    );
  }, [selectedPost, userProfile]);


  const addPost = useCallback((newPost: Omit<Post, 'id' | 'likes' | 'comments' | 'user'>) => {
    const post: Post = {
      id: new Date().toISOString(),
      user: { name: userProfile.name, avatarUrl: userProfile.avatarUrl },
      likes: 0,
      comments: 0,
      liked: false,
      commentList: [],
      ...newPost
    };
    setPosts(prevPosts => [post, ...prevPosts]);
    closeCreateModal();
  }, [closeCreateModal, userProfile]);

  const handleUpdateProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header onNewPostClick={openCreateModal} onProfileClick={openProfileModal} />
      <main className="container mx-auto px-4 py-8">
        <Feed posts={posts} onPostClick={handleSelectPost} />
      </main>
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onPostSubmit={addPost}
      />
      <PostDetailModal
        post={selectedPost}
        onClose={handleClosePostDetail}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onOpenSettings={openSettingsModal}
      />
       <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

export default App;
