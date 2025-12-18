
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import * as db from './services/supabaseService';
import type { Post, Comment, UserProfile, AppSettings, NewPost } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';

// Since there is no auth, we'll hardcode the user ID.
// In a real app, this would come from the authenticated user session.
const CURRENT_USER_ID = '3e5b32f9-674b-4c2d-9c3b-2a134a942663';

const initialSettings: AppSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
};

const showNotification = (title: string, options: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.error("Este browser não suporta notificações.");
    return;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};


function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadAppDate = useCallback(async () => {
    setIsLoading(true);
    const [fetchedPosts, fetchedProfile] = await Promise.all([
        db.getPosts(),
        db.getUserProfile(CURRENT_USER_ID)
    ]);
    setPosts(fetchedPosts as Post[]);
    setUserProfile(fetchedProfile as UserProfile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAppDate();
  }, [loadAppDate]);

  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.darkMode]);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  const openSettingsModal = useCallback(() => {
    closeProfileModal();
    setIsSettingsModalOpen(true);
  }, [closeProfileModal]);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

  const openStoryViewer = useCallback(() => {
    if (userProfile?.storyUrl) {
        closeProfileModal();
        setIsStoryViewerOpen(true);
    }
  }, [userProfile?.storyUrl, closeProfileModal]);
  const closeStoryViewer = useCallback(() => setIsStoryViewerOpen(false), []);


  const handleSelectPost = useCallback(async (post: Post) => {
    const comments = await db.getCommentsForPost(post.id);
    setSelectedPost({ ...post, commentList: comments as Comment[]});
  }, []);

  const handleClosePostDetail = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const handleToggleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newLikedState = !post.liked;
    const newLikesCount = newLikedState ? post.likes + 1 : post.likes - 1;

    // Optimistic update
    const updatePostsState = (p: Post) => ({ ...p, liked: newLikedState, likes: newLikesCount });
    setPosts(prev => prev.map(p => p.id === postId ? updatePostsState(p) : p));
    if (selectedPost?.id === postId) {
      setSelectedPost(updatePostsState(selectedPost));
    }

    const updatedPost = await db.toggleLike(postId, newLikesCount);
    
    if (appSettings.pushNotifications && newLikedState) {
      showNotification('Postagem Curtida!', {
        body: `Você curtiu a postagem de ${post.user.name}.`,
        icon: post.imageUrl,
      });
    }
  }, [posts, selectedPost, appSettings.pushNotifications]);

  const handleAddComment = useCallback(async (postId: string, commentText: string) => {
    if (!userProfile) return;
    
    const newComment = await db.addComment(postId, commentText, userProfile);
    
    if (newComment && selectedPost) {
      const updatedCommentList = [newComment, ...(selectedPost.commentList || [])];
      setSelectedPost({ ...selectedPost, commentList: updatedCommentList, comments: updatedCommentList.length });
       setPosts(prevPosts => prevPosts.map(p => p.id === postId ? {...p, comments: p.comments + 1} : p));

       if (appSettings.pushNotifications) {
        showNotification('Novo Comentário!', {
          body: `Você comentou: "${commentText}"`,
          icon: selectedPost.imageUrl,
        });
      }
    }
  }, [selectedPost, userProfile, appSettings.pushNotifications]);


  const addPost = useCallback(async (newPostData: NewPost) => {
    if (!userProfile) return;
    closeCreateModal();
    setIsLoading(true);

    const newPost = await db.createPost(newPostData, userProfile);
    if(newPost) {
        setPosts(prevPosts => [newPost as Post, ...prevPosts]);
        if (appSettings.pushNotifications) {
          showNotification('Nova Postagem Criada!', {
            body: `Sua postagem "${newPost.caption.substring(0, 30)}..." foi publicada.`,
            icon: newPost.imageUrl,
          });
        }
    }
    setIsLoading(false);
  }, [closeCreateModal, userProfile, appSettings.pushNotifications]);

  const handleUpdateProfile = useCallback(async (newProfileData: Pick<UserProfile, 'name' | 'bio'>) => {
    if (!userProfile) return;
    const updatedProfile = await db.updateUserProfile(userProfile.id, newProfileData);
    if (updatedProfile) {
        setUserProfile(updatedProfile as UserProfile);
    }
  }, [userProfile]);
  
  const handleSetStory = useCallback(async (storyFile: File) => {
      if(!userProfile) return;
      closeProfileModal();
      setIsLoading(true);
      const updatedProfile = await db.setStory(userProfile.id, storyFile);
      if (updatedProfile) {
        setUserProfile(updatedProfile as UserProfile);
         if (appSettings.pushNotifications) {
            showNotification('Novo Story Adicionado!', {
                body: 'Seu story foi publicado com sucesso.',
                icon: updatedProfile.storyUrl!,
            });
        }
        setIsLoading(false);
        // We need to re-open the story viewer from here after upload
        setIsStoryViewerOpen(true);
      } else {
        setIsLoading(false);
      }
  }, [userProfile, appSettings.pushNotifications, closeProfileModal]);


  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    if (newSettings.pushNotifications && !appSettings.pushNotifications) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    setAppSettings(newSettings);
  }, [appSettings]);
  
  if (isLoading && !selectedPost) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando...</p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header onNewPostClick={openCreateModal} onProfileClick={openProfileModal} />
      <main className="container mx-auto px-4 py-8">
        <Feed posts={posts} onPostClick={handleSelectPost} />
      </main>
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onPostSubmit={addPost}
      />
      {selectedPost && userProfile && (
        <PostDetailModal
            post={selectedPost}
            onClose={handleClosePostDetail}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
            currentUser={userProfile}
        />
      )}
      {userProfile && (
        <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={closeProfileModal}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onOpenSettings={openSettingsModal}
            onSetStory={handleSetStory}
            onOpenStoryViewer={openStoryViewer}
        />
      )}
       <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
      />
      {userProfile && (
        <StoryViewerModal
            isOpen={isStoryViewerOpen}
            onClose={closeStoryViewer}
            storyUrl={userProfile.storyUrl}
            user={userProfile}
        />
      )}
    </div>
  );
}

export default App;
