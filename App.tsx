
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { ChoiceModal } from './components/ChoiceModal';
import { LiveAudioModal } from './components/LiveAudioModal';
import * as db from './services/supabaseService';
import type { Post, Comment, UserProfile, AppSettings, NewPost, Story, LiveSession, LiveSessionWithHost } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './services/supabaseService';

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
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isLiveAudioModalOpen, setIsLiveAudioModalOpen] = useState(false);
  const [currentLiveSession, setCurrentLiveSession] = useState<LiveSession | LiveSessionWithHost | null>(null);
  const [userRoleInLive, setUserRoleInLive] = useState<'host' | 'listener' | null>(null);
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSessionWithHost[]>([]);
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
    const [fetchedPosts, fetchedProfile, fetchedLiveSessions] = await Promise.all([
        db.getPosts(),
        db.getUserProfile(CURRENT_USER_ID),
        db.getActiveLiveSessions(),
    ]);
    setPosts(fetchedPosts as Post[]);
    setUserProfile(fetchedProfile as UserProfile);
    setActiveLiveSessions(fetchedLiveSessions as LiveSessionWithHost[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAppDate();
  }, [loadAppDate]);

  // Real-time subscription for new posts
  useEffect(() => {
    const channel = supabase.channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, 
      (payload) => {
        const newPost = db.formatPost(payload.new);
        // Add post to state
        setPosts(currentPosts => [newPost, ...currentPosts]);

        // Trigger notification if enabled and the post is from another user
        if (appSettings.pushNotifications && userProfile && newPost.user.name !== userProfile.name) {
          showNotification(`Nova postagem de ${newPost.user.name}`, {
            body: newPost.caption.substring(0, 100),
            icon: newPost.imageUrl,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appSettings.pushNotifications, userProfile]);

  // Real-time subscription for live sessions
  useEffect(() => {
    const handleNewSession = async (payload: any) => {
        const newSessionWithHost = await db.getLiveSessionById(payload.new.id);
        if (newSessionWithHost) {
            setActiveLiveSessions(prev => [newSessionWithHost, ...prev.filter(s => s.id !== newSessionWithHost.id)]);
        }
    };
    
    const handleSessionUpdate = async (payload: any) => {
        const sessionData = payload.new;
        if (!sessionData.is_live) {
            setActiveLiveSessions(prev => prev.filter(s => s.id !== sessionData.id));
        } else {
            const updatedSessionWithHost = await db.getLiveSessionById(sessionData.id);
            if (updatedSessionWithHost) {
                setActiveLiveSessions(prev => prev.map(s => s.id === updatedSessionWithHost.id ? updatedSessionWithHost : s));
            }
        }
    };

    const liveSessionsChannel = supabase.channel('public:live_sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_sessions' }, handleNewSession)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions' }, handleSessionUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(liveSessionsChannel);
    };
  }, []);


  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.darkMode]);

  const openChoiceModal = useCallback(() => setIsChoiceModalOpen(true), []);
  const closeChoiceModal = useCallback(() => setIsChoiceModalOpen(false), []);
  
  const openCreateModal = useCallback(() => {
    closeChoiceModal();
    setIsCreateModalOpen(true);
  }, []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  const openSettingsModal = useCallback(() => {
    closeProfileModal();
    setIsSettingsModalOpen(true);
  }, [closeProfileModal]);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

  const openStoryViewer = useCallback(() => {
    if (userProfile?.stories && userProfile.stories.length > 0) {
        closeProfileModal();
        setIsStoryViewerOpen(true);
    }
  }, [userProfile?.stories, closeProfileModal]);
  const closeStoryViewer = useCallback(() => setIsStoryViewerOpen(false), []);

  const handleStartLive = useCallback(async () => {
    if (!userProfile) return;
    closeChoiceModal();
    setIsLoading(true);
    const session = await db.createLiveSession(userProfile.id);
    if (session) {
      setCurrentLiveSession(session);
      setUserRoleInLive('host');
      setIsLiveAudioModalOpen(true);
    }
    setIsLoading(false);
  }, [userProfile]);

  const handleJoinLive = useCallback((session: LiveSessionWithHost) => {
    setCurrentLiveSession(session);
    setUserRoleInLive('listener');
    setIsLiveAudioModalOpen(true);
  }, []);

  const handleEndLive = useCallback(async () => {
    if (currentLiveSession && userRoleInLive === 'host') {
      // Optimistically remove the session from the UI for the host
      setActiveLiveSessions(prev => prev.filter(s => s.id !== currentLiveSession.id));
      await db.endLiveSession(currentLiveSession.id);
    }
    setIsLiveAudioModalOpen(false);
    setCurrentLiveSession(null);
    setUserRoleInLive(null);
  }, [currentLiveSession, userRoleInLive]);


  const handleSelectPost = useCallback(async (post: Post) => {
    const comments = await db.getCommentsForPost(post.id);
    setSelectedPost({ ...post, commentList: comments as Comment[]});
  }, []);

  const handleSelectPostFromProfile = useCallback((post: Post) => {
    closeProfileModal();
    // Use a timeout to ensure the profile modal has finished its closing animation
    setTimeout(() => {
      handleSelectPost(post);
    }, 300);
  }, [handleSelectPost]);

  const handleClosePostDetail = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const handleDeletePost = useCallback(async (postId: string, imageUrl: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta postagem? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    const success = await db.deletePost(postId, imageUrl);
    if (success) {
        if (selectedPost?.id === postId) {
            handleClosePostDetail();
        }
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
        // TODO: Add a success toast/notification
    } else {
        alert('Não foi possível excluir a postagem.');
    }
  }, [selectedPost, handleClosePostDetail]);

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
        // The real-time listener will add the post, so we don't add it twice.
        // setPosts(prevPosts => [newPost as Post, ...prevPosts]); 
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
        setUserProfile(prevProfile => {
            if (!prevProfile) return updatedProfile as UserProfile;
            return {
                ...prevProfile,
                name: updatedProfile.name,
                bio: updatedProfile.bio,
            };
        });
    }
  }, [userProfile]);
  
  const handleAddStory = useCallback(async (storyFile: File) => {
      if(!userProfile) return;
      closeProfileModal();
      setIsLoading(true);
      const newStory = await db.addStory(userProfile.id, storyFile, { name: userProfile.name, avatarUrl: userProfile.avatarUrl });
      if (newStory) {
        setUserProfile(prevProfile => {
            if (!prevProfile) return null;
            const existingStories = prevProfile.stories || [];
            return {
                ...prevProfile,
                stories: [...existingStories, newStory as Story]
            };
        });

         if (appSettings.pushNotifications) {
            showNotification('Novo Story Adicionado!', {
                body: 'Seu story foi publicado com sucesso.',
                icon: newStory.imageUrl,
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
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              setAppSettings(newSettings);
              showNotification('Notificações Ativadas!', { body: 'Você agora receberá atualizações.' });
            } else {
              // User denied permission, don't update the setting state
            }
          });
          return; // prevent setting state immediately
        } else if (Notification.permission === 'denied') {
          alert('As notificações foram bloqueadas. Você precisa permitir nas configurações do seu navegador para ativar este recurso.');
          return; // Do not update settings if permission is denied
        }
      }
    }
    setAppSettings(newSettings);
  }, [appSettings]);
  
  if (isLoading && !selectedPost && !isLiveAudioModalOpen) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando...</p>
            </div>
        </div>
    )
  }

  const userPosts = userProfile ? posts.filter(p => p.user_id === userProfile.id) : [];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header onNewPostClick={openChoiceModal} onProfileClick={openProfileModal} />
      <main className="container mx-auto px-4 py-8">
        <Feed 
          posts={posts} 
          onPostClick={handleSelectPost} 
          liveSessions={activeLiveSessions} 
          onJoinLive={handleJoinLive} 
          currentUser={userProfile}
          onDeletePost={handleDeletePost}
          onToggleLike={handleToggleLike}
        />
      </main>

      <ChoiceModal 
        isOpen={isChoiceModalOpen}
        onClose={closeChoiceModal}
        onSelectPost={openCreateModal}
        onSelectLive={handleStartLive}
      />

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
            onDeletePost={handleDeletePost}
            currentUser={userProfile}
        />
      )}
      {userProfile && (
        <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={closeProfileModal}
            userProfile={userProfile}
            userPosts={userPosts}
            onUpdateProfile={handleUpdateProfile}
            onOpenSettings={openSettingsModal}
            onAddStory={handleAddStory}
            onOpenStoryViewer={openStoryViewer}
            onSelectPost={handleSelectPostFromProfile}
            onDeletePost={handleDeletePost}
        />
      )}
       <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
      />
      {userProfile && userProfile.stories && userProfile.stories.length > 0 && (
        <StoryViewerModal
            isOpen={isStoryViewerOpen}
            onClose={closeStoryViewer}
            stories={userProfile.stories}
            user={userProfile}
        />
      )}
      {isLiveAudioModalOpen && currentLiveSession && userProfile && userRoleInLive && (
        <LiveAudioModal
          isOpen={isLiveAudioModalOpen}
          onClose={handleEndLive}
          session={currentLiveSession}
          currentUser={userProfile}
          role={userRoleInLive}
        />
      )}
    </div>
  );
}

export default App;
