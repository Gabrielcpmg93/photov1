
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import * as db from './services/supabaseService';
import type { Post, Comment, UserProfile, AppSettings, NewPost, Story, LiveSession, LiveSessionParticipant } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './services/supabaseService';
import { NotificationHelpModal } from './components/NotificationHelpModal';
import { LiveSessionsBar } from './components/LiveSessionsBar';
import { LiveAudioModal } from './components/LiveAudioModal';

// Since there is no auth, we'll hardcode the user ID.
// In a real app, this would come from the authenticated user session.
const CURRENT_USER_ID = '3e5b32f9-674b-4c2d-9c3b-2a134a942663';

const initialSettings: AppSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
  showLiveSessions: true,
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
  const [isNotificationHelpModalOpen, setIsNotificationHelpModalOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [newlyAddedStory, setNewlyAddedStory] = useState<Story | null>(null);
  const [isLiveAudioModalOpen, setIsLiveAudioModalOpen] = useState(false);
  const [currentLiveSession, setCurrentLiveSession] = useState<LiveSession | null>(null);
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSession[]>([]);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [fetchedPosts, fetchedProfile, fetchedLiveSessions] = await Promise.all([
          db.getPosts(),
          db.getUserProfile(CURRENT_USER_ID),
          db.getActiveLiveSessions(),
      ]);
      setPosts(fetchedPosts as Post[]);
      setUserProfile(fetchedProfile as UserProfile);
      setActiveLiveSessions(fetchedLiveSessions as LiveSession[]);
      setIsLoading(false);
    };

    loadInitialData();
  }, []);


  // Real-time subscriptions
  useEffect(() => {
    // New posts
    const postsChannel = supabase.channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = db.formatPost(payload.new);
        setPosts(currentPosts => [newPost, ...currentPosts]);
        if (appSettings.pushNotifications && userProfile && newPost.user_id !== userProfile.id) {
          showNotification(`Nova postagem de ${newPost.user.name}`, {
            body: newPost.caption.substring(0, 100),
            icon: newPost.imageUrl,
          });
        }
      }).subscribe();

    // Notifications for likes and comments on user's posts
    if (userProfile) {
        const userPostIds = posts.filter(p => p.user_id === userProfile.id).map(p => p.id);
        if (userPostIds.length > 0) {
            const notificationsChannel = supabase.channel('notifications-channel')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=in.(${userPostIds.join(',')})` }, (payload) => {
                    if (appSettings.pushNotifications && payload.new.user_name !== userProfile.name) {
                        const post = posts.find(p => p.id === payload.new.post_id);
                        showNotification(`${payload.new.user_name} comentou sua postagem`, {
                            body: `"${payload.new.text.substring(0, 50)}..."`,
                            icon: post?.imageUrl,
                        });
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=in.(${userPostIds.join(',')})` }, (payload) => {
                     if (appSettings.pushNotifications && payload.new.likes > payload.old.likes) {
                        showNotification(`Nova curtida na sua postagem!`, {
                            body: `Sua postagem "${payload.new.caption.substring(0, 50)}..." foi curtida.`,
                            icon: payload.new.image_url,
                        });
                    }
                })
                .subscribe();
            
            return () => {
                supabase.removeChannel(postsChannel);
                supabase.removeChannel(notificationsChannel);
            };
        }
    }

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [appSettings.pushNotifications, userProfile, posts]);


  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.darkMode]);

  useEffect(() => {
    if (newlyAddedStory) {
        setIsLoading(false);
        setIsStoryViewerOpen(true);
        setNewlyAddedStory(null);
    }
  }, [newlyAddedStory]);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  const openSettingsModal = useCallback(() => {
    closeProfileModal();
    setIsSettingsModalOpen(true);
  }, []);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);
  
  const openNotificationHelpModal = useCallback(() => setIsNotificationHelpModalOpen(true), []);
  const closeNotificationHelpModal = useCallback(() => setIsNotificationHelpModalOpen(false), []);

  const openStoryViewer = useCallback(() => {
    if (userProfile?.stories && userProfile.stories.length > 0) {
        closeProfileModal();
        setIsStoryViewerOpen(true);
    }
  }, [userProfile?.stories]);
  const closeStoryViewer = useCallback(() => setIsStoryViewerOpen(false), []);
  
  const handleStartLiveSession = useCallback(() => {
    if (!userProfile) return;
    closeCreateModal();
    const newSession: LiveSession = {
        id: `live_${userProfile.id}_${Date.now()}`,
        title: `${userProfile.name}'s Live Room`,
        host: { ...userProfile, id: userProfile.id, isSpeaker: true, isMuted: false, isHost: true },
        speakers: [{ ...userProfile, id: userProfile.id, isSpeaker: true, isMuted: false, isHost: true }],
        listeners: [],
        requestsToSpeak: [],
    };
    setCurrentLiveSession(newSession);
    setIsLiveAudioModalOpen(true);
  }, [userProfile, closeCreateModal]);

  const handleJoinSession = (sessionToJoin: LiveSession) => {
    if (!userProfile) return;
    setCurrentLiveSession(sessionToJoin);
    setIsLiveAudioModalOpen(true);
  };

  const handleCloseLiveAudioModal = useCallback(() => {
    setIsLiveAudioModalOpen(false);
    setCurrentLiveSession(null);
  }, []);

  const handleSelectPost = useCallback(async (post: Post) => {
    const comments = await db.getCommentsForPost(post.id);
    setSelectedPost({ ...post, commentList: comments as Comment[]});
  }, []);

  const handleSelectPostFromProfile = useCallback((post: Post) => {
    closeProfileModal();
    setTimeout(() => handleSelectPost(post), 300);
  }, [handleSelectPost]);

  const handleClosePostDetail = useCallback(() => setSelectedPost(null), []);

  const handleDeletePost = useCallback(async (postId: string, imageUrl: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta postagem?')) return;
    
    if (await db.deletePost(postId, imageUrl)) {
        if (selectedPost?.id === postId) handleClosePostDetail();
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
    } else {
        alert('Não foi possível excluir a postagem.');
    }
  }, [selectedPost, handleClosePostDetail]);

  const handleToggleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newLikedState = !post.liked;
    const newLikesCount = newLikedState ? post.likes + 1 : post.likes - 1;

    const update = (p: Post) => ({ ...p, liked: newLikedState, likes: newLikesCount });
    setPosts(prev => prev.map(p => p.id === postId ? update(p) : p));
    if (selectedPost?.id === postId) setSelectedPost(update(selectedPost));

    await db.toggleLike(postId, newLikesCount);
  }, [posts, selectedPost]);

  const handleToggleSave = useCallback((postId: string) => {
    const update = (p: Post) => ({ ...p, saved: !p.saved });
    setPosts(currentPosts => currentPosts.map(p => (p.id === postId ? update(p) : p)));
    if (selectedPost?.id === postId) setSelectedPost(prev => (prev ? update(prev) : null));
  }, [posts, selectedPost]);

  const handleAddComment = useCallback(async (postId: string, commentText: string) => {
    if (!userProfile) return;
    
    const newComment = await db.addComment(postId, commentText, userProfile);
    
    if (newComment && selectedPost) {
      const updatedList = [...(selectedPost.commentList || []), newComment];
      setSelectedPost({ ...selectedPost, commentList: updatedList, comments: updatedList.length });
      setPosts(prev => prev.map(p => p.id === postId ? {...p, comments: p.comments + 1} : p));
    }
  }, [selectedPost, userProfile]);

  const addPost = useCallback(async (newPostData: NewPost) => {
    if (!userProfile) return;
    closeCreateModal();
    setIsLoading(true);
    await db.createPost(newPostData, userProfile);
    setIsLoading(false);
  }, [closeCreateModal, userProfile]);

  const handleUpdateProfile = useCallback(async (newProfileData: Pick<UserProfile, 'name' | 'bio'>) => {
    if (!userProfile) return;
    const updated = await db.updateUserProfile(userProfile.id, newProfileData);
    if (updated) {
        setUserProfile(prev => prev ? { ...prev, name: updated.name, bio: updated.bio } : updated as UserProfile);
    }
  }, [userProfile]);

  const handleUpdateProfilePicture = useCallback(async (file: File) => {
    if (!userProfile) return;
    const newAvatarUrl = await db.updateUserProfilePicture(userProfile.id, file, userProfile.avatarUrl);
    if (newAvatarUrl) {
        setUserProfile(p => p ? { ...p, avatarUrl: newAvatarUrl } : null);
        setPosts(prev => prev.map(p => p.user_id === userProfile.id ? { ...p, user: { ...p.user, avatarUrl: newAvatarUrl } } : p));
        if (selectedPost?.user_id === userProfile.id) {
            setSelectedPost(p => p ? { ...p, user: { ...p.user, avatarUrl: newAvatarUrl } } : null);
        }
    }
  }, [userProfile, selectedPost]);
  
  const handleAddStory = useCallback(async (storyFile: File) => {
      if(!userProfile) return;
      setIsLoading(true);
      const newStory = await db.addStory(userProfile.id, storyFile, { name: userProfile.name, avatarUrl: userProfile.avatarUrl });
      if (newStory) {
        setUserProfile(p => p ? { ...p, stories: [...(p.stories || []), newStory] } : null);
        setNewlyAddedStory(newStory);
      } else {
        setIsLoading(false);
      }
  }, [userProfile]);

  const handleStartStoryCreation = useCallback((storyFile: File) => {
    closeProfileModal();
    handleAddStory(storyFile);
  }, [closeProfileModal, handleAddStory]);


  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    if (newSettings.pushNotifications && !appSettings.pushNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => { if (p === 'granted') setAppSettings(newSettings); });
        return;
      } else if (Notification.permission === 'denied') {
        openNotificationHelpModal();
        return;
      }
    }
    setAppSettings(newSettings);
  }, [appSettings, openNotificationHelpModal]);
  
  if (isLoading && !selectedPost) {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-transparent flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando...</p>
            </div>
        </div>
    )
  }

  const userPosts = userProfile ? posts.filter(p => p.user_id === userProfile.id) : [];
  const savedPosts = posts.filter(p => p.saved);

  return (
    <div className={`min-h-screen bg-gray-100 text-gray-900 dark:bg-transparent dark:text-gray-100 transition-colors duration-300 ${appSettings.darkMode ? 'aurora-background' : ''}`}>
      <Header onNewPostClick={openCreateModal} onProfileClick={openProfileModal} />
      <main className="container mx-auto px-4 py-8">
        {appSettings.showLiveSessions && <LiveSessionsBar sessions={activeLiveSessions} onJoinSession={handleJoinSession} />}
        <Feed 
          posts={posts} 
          onPostClick={handleSelectPost} 
          currentUser={userProfile}
          onDeletePost={handleDeletePost}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
        />
      </main>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onPostSubmit={addPost}
        onStartLiveSession={handleStartLiveSession}
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
      <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={closeProfileModal}
          userProfile={userProfile}
          userPosts={userPosts}
          savedPosts={savedPosts}
          onUpdateProfile={handleUpdateProfile}
          onUpdateProfilePicture={handleUpdateProfilePicture}
          onOpenSettings={openSettingsModal}
          onStartStoryCreation={handleStartStoryCreation}
          onOpenStoryViewer={openStoryViewer}
          onSelectPost={handleSelectPostFromProfile}
          onDeletePost={handleDeletePost}
      />
       <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
      />
       <NotificationHelpModal
        isOpen={isNotificationHelpModalOpen}
        onClose={closeNotificationHelpModal}
      />
      {userProfile?.stories?.length > 0 && (
        <StoryViewerModal
            isOpen={isStoryViewerOpen}
            onClose={closeStoryViewer}
            stories={userProfile.stories}
            user={userProfile}
        />
      )}
      {userProfile && (
        <LiveAudioModal 
            isOpen={isLiveAudioModalOpen}
            onClose={handleCloseLiveAudioModal}
            session={currentLiveSession}
            currentUser={userProfile}
        />
      )}
    </div>
  );
}

export default App;
