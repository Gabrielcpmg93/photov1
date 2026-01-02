
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { LiveSessionsBar } from './components/LiveSessionsBar';
import { LiveAudioModal } from './components/LiveAudioModal';
import { ChoiceModal } from './components/ChoiceModal';
import { MusicSelectionModal } from './components/MusicSelectionModal';
import { NotificationHelpModal } from './components/NotificationHelpModal';
import * as db from './services/supabaseService';
import type { Post, Comment, UserProfile, AppSettings, NewPost, Story, LiveSession, MusicTrack } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './services/supabaseService';

const CURRENT_USER_ID = '3e5b32f9-674b-4c2d-9c3b-2a134a942663';

const initialSettings: AppSettings = {
  darkMode: true,
  emailNotifications: true,
  pushNotifications: false,
  showLiveSessions: true,
};

const MOCK_MUSIC_TRACKS: MusicTrack[] = [
    { id: '1', title: 'Acoustic Breeze', artist: 'Benjamin Tissot', track_url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3' },
    { id: '2', title: 'Going Higher', artist: 'Benjamin Tissot', track_url: 'https://www.bensound.com/bensound-music/bensound-goinghigher.mp3' },
    { id: '3', title: 'Sunny', artist: 'Benjamin Tissot', track_url: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3' },
];

function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  // New states for modern systems
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSession[]>([]);
  const [activeLiveSessionModal, setActiveLiveSessionModal] = useState<LiveSession | null>(null);
  const [viewedStoryUser, setViewedStoryUser] = useState<UserProfile | null>(null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [storyFileToUpload, setStoryFileToUpload] = useState<File | null>(null);
  const [isNotificationHelpOpen, setNotificationHelpOpen] = useState(false);


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [fetchedPosts, fetchedProfile, fetchedSessions] = await Promise.all([
          db.getPosts(), 
          db.getUserProfile(CURRENT_USER_ID),
          db.getActiveLiveSessions(),
      ]);
      const savedPostIds = db.getSavedPostIds();
      const postsWithSavedState = (fetchedPosts as Post[]).map(p => ({ ...p, saved: savedPostIds.includes(p.id) }));
      
      setPosts(postsWithSavedState);
      setUserProfile(fetchedProfile as UserProfile);
      setActiveLiveSessions(fetchedSessions as LiveSession[]);
      setIsLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const postsChannel = supabase.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = db.formatPost(payload.new);
        setPosts(currentPosts => [newPost, ...currentPosts]);
    }).subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, []);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
  const openSettingsModal = useCallback(() => { closeProfileModal(); setIsSettingsModalOpen(true); }, []);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);
  const handleClosePostDetail = useCallback(() => setSelectedPost(null), []);

  const handleSelectPost = useCallback(async (post: Post) => {
    const comments = await db.getCommentsForPost(post.id);
    setSelectedPost({ ...post, commentList: comments as Comment[]});
  }, []);

  const handleDeletePost = useCallback(async (postId: string, imageUrl: string) => {
    if (await db.deletePost(postId, imageUrl)) {
        if (selectedPost?.id === postId) handleClosePostDetail();
        setPosts(prev => prev.filter(p => p.id !== postId));
    }
  }, [selectedPost, handleClosePostDetail]);

  const handleToggleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const newLikedState = !post.liked;
    const newLikesCount = newLikedState ? post.likes + 1 : post.likes - 1;
    const updatedPost = await db.toggleLike(postId, newLikesCount);
    if (updatedPost) {
        const update = (p: Post) => ({ ...p, liked: newLikedState, likes: newLikesCount });
        setPosts(prev => prev.map(p => p.id === postId ? update(p) : p));
        if (selectedPost?.id === postId) setSelectedPost(update(selectedPost));
    }
  }, [posts, selectedPost]);

  const handleToggleSave = useCallback((postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const newSavedState = !post.saved;
      if (newSavedState) db.savePost(postId); else db.unsavePost(postId);
      const update = (p: Post) => ({ ...p, saved: newSavedState });
      setPosts(current => current.map(p => (p.id === postId ? update(p) : p)));
      if (selectedPost?.id === postId) setSelectedPost(prev => (prev ? update(prev) : null));
  }, [posts, selectedPost]);

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
    if (updated) { setUserProfile(prev => prev ? { ...prev, ...updated } : updated as UserProfile); }
  }, [userProfile]);
  
  const handleUpdateProfilePicture = useCallback(async (file: File) => {
      if (!userProfile) return;
      const newUrl = await db.updateUserProfilePicture(userProfile.id, file, userProfile.avatarUrl);
      if(newUrl) {
          setUserProfile(p => p ? { ...p, avatarUrl: newUrl } : null);
      }
  }, [userProfile]);

  // Handlers for modern systems
  const handleStartLiveSession = async (title: string) => {
    if (!userProfile) return;
    const newSession = await db.createLiveSession(title, userProfile);
    if (newSession) {
      setActiveLiveSessions(prev => [newSession, ...prev]);
      setActiveLiveSessionModal(newSession);
    }
  };
  
  const handleJoinSession = (session: LiveSession) => setActiveLiveSessionModal(session);
  const handleCloseLiveSession = (sessionId: string) => {
      setActiveLiveSessionModal(null);
      // In a real app, you'd update session status from a backend event
  };
  
  const handleStartStoryCreation = (storyFile: File) => {
      setStoryFileToUpload(storyFile);
      setIsMusicModalOpen(true);
  };
  
  const handleMusicTrackSelected = async (track?: MusicTrack) => {
      setIsMusicModalOpen(false);
      if (storyFileToUpload && userProfile) {
          setIsLoading(true);
          const newStory = await db.addStory(userProfile.id, storyFileToUpload, userProfile, track);
          if (newStory) {
              setUserProfile(prev => prev ? { ...prev, stories: [...(prev.stories || []), newStory] } : null);
          }
          setStoryFileToUpload(null);
          setIsLoading(false);
      }
  };

  const handleOpenStoryViewer = (user: UserProfile) => setViewedStoryUser(user);
  
  const handleNewPostClick = () => setIsChoiceModalOpen(true);

  if (isLoading && !selectedPost) {
    return <div className="min-h-screen bg-gray-100 dark:bg-transparent flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const userPosts = userProfile ? posts.filter(p => p.user_id === userProfile.id) : [];
  const savedPosts = posts.filter(p => p.saved);

  return (
    <div className={`min-h-screen bg-gray-100 text-gray-900 dark:bg-transparent dark:text-gray-100 transition-colors duration-300 ${appSettings.darkMode ? 'aurora-background' : ''}`}>
      <Header onNewPostClick={handleNewPostClick} onProfileClick={openProfileModal} />
      <main className="container mx-auto px-4 py-8">
        {appSettings.showLiveSessions && <LiveSessionsBar sessions={activeLiveSessions} onJoinSession={handleJoinSession} />}
        <Feed posts={posts} onPostClick={handleSelectPost} currentUser={userProfile} onDeletePost={handleDeletePost} onToggleLike={handleToggleLike} onToggleSave={handleToggleSave} />
      </main>
      
      <ChoiceModal 
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectPost={() => { setIsChoiceModalOpen(false); openCreateModal(); }}
        onSelectLive={(title) => { setIsChoiceModalOpen(false); handleStartLiveSession(title); }}
      />
      
      <CreatePostModal isOpen={isCreateModalOpen} onClose={closeCreateModal} onPostSubmit={addPost} />

      {activeLiveSessionModal && userProfile && (
        <LiveAudioModal 
            isOpen={!!activeLiveSessionModal}
            onClose={handleCloseLiveSession}
            session={activeLiveSessionModal}
            currentUser={userProfile}
        />
      )}
      
      {viewedStoryUser && (
        <StoryViewerModal 
            isOpen={!!viewedStoryUser}
            onClose={() => setViewedStoryUser(null)}
            stories={viewedStoryUser.stories || []}
            user={viewedStoryUser}
        />
      )}
      
      <MusicSelectionModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSelectTrack={handleMusicTrackSelected}
        tracks={MOCK_MUSIC_TRACKS}
      />

      <NotificationHelpModal 
        isOpen={isNotificationHelpOpen}
        onClose={() => setNotificationHelpOpen(false)}
      />

      {selectedPost && userProfile && <PostDetailModal post={selectedPost} onClose={handleClosePostDetail} onToggleLike={handleToggleLike} onAddComment={() => {}} onDeletePost={handleDeletePost} currentUser={userProfile} />}
      
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
        onOpenStoryViewer={() => userProfile && handleOpenStoryViewer(userProfile)}
        onSelectPost={handleSelectPost} 
        onDeletePost={handleDeletePost} 
       />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={closeSettingsModal} 
        settings={appSettings} 
        onUpdateSettings={setAppSettings}
        onOpenNotificationHelp={() => setNotificationHelpOpen(true)}
      />
    </div>
  );
}

export default App;