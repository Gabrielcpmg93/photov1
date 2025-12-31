
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePostModal } from './components/CreatePostModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import * as db from './services/supabaseService';
import type { Post, Comment, UserProfile, AppSettings, NewPost, Story } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './services/supabaseService';
import { NotificationHelpModal } from './components/NotificationHelpModal';

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


  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      // Fetch posts and profile together. This is the critical data for initial interaction.
      const [fetchedPosts, fetchedProfile] = await Promise.all([
          db.getPosts(),
          db.getUserProfile(CURRENT_USER_ID),
      ]);
      setPosts(fetchedPosts as Post[]);
      setUserProfile(fetchedProfile as UserProfile);
      setIsLoading(false); // UI is now ready with essential data
    };

    loadInitialData();
  }, []); // Empty dependency array means this runs only once on mount


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
        setNewlyAddedStory(null); // Reset after opening
    }
  }, [newlyAddedStory]);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  const openSettingsModal = useCallback(() => {
    closeProfileModal();
    setIsSettingsModalOpen(true);
  }, [closeProfileModal]);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);
  
  const openNotificationHelpModal = useCallback(() => setIsNotificationHelpModalOpen(true), []);
  const closeNotificationHelpModal = useCallback(() => setIsNotificationHelpModalOpen(false), []);

  const openStoryViewer = useCallback(() => {
    if (userProfile?.stories && userProfile.stories.length > 0) {
        closeProfileModal();
        setIsStoryViewerOpen(true);
    }
  }, [userProfile?.stories, closeProfileModal]);
  const closeStoryViewer = useCallback(() => setIsStoryViewerOpen(false), []);

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
  }, [handleSelectPost, closeProfileModal]);

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

  const handleToggleSave = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newSavedState = !post.saved;

    // Optimistic update for UI responsiveness
    const updatePostState = (p: Post) => ({ ...p, saved: newSavedState });

    setPosts(currentPosts =>
      currentPosts.map(p => (p.id === postId ? updatePostState(p) : p))
    );

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => (prev ? updatePostState(prev) : null));
    }
  }, [posts, selectedPost]);

  const handleAddComment = useCallback(async (postId: string, commentText: string) => {
    if (!userProfile) return;
    
    const newComment = await db.addComment(postId, commentText, userProfile);
    
    if (newComment && selectedPost) {
      const updatedCommentList = [...(selectedPost.commentList || []), newComment];
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

  const handleUpdateProfilePicture = useCallback(async (file: File) => {
    if (!userProfile) return;
    
    const newAvatarUrl = await db.updateUserProfilePicture(userProfile.id, file, userProfile.avatarUrl);
    if (newAvatarUrl) {
        // Update profile state
        const updatedProfile = { ...userProfile, avatarUrl: newAvatarUrl };
        setUserProfile(updatedProfile);

        // Update posts in feed to reflect new avatar
        setPosts(prevPosts => prevPosts.map(p => 
            p.user_id === userProfile.id ? { ...p, user: { ...p.user, avatarUrl: newAvatarUrl } } : p
        ));

        // Update selected post if it's from the user
        if (selectedPost && selectedPost.user_id === userProfile.id) {
            setSelectedPost(prev => prev ? { ...prev, user: { ...prev.user, avatarUrl: newAvatarUrl } } : null);
        }
    }
  }, [userProfile, selectedPost]);
  
  const handleAddStory = useCallback(async (storyFile: File) => {
      if(!userProfile) return;
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
        setNewlyAddedStory(newStory);

         if (appSettings.pushNotifications) {
            showNotification('Novo Story Adicionado!', {
                body: 'Seu story foi publicado com sucesso.',
                icon: newStory.imageUrl,
            });
        }
      } else {
        setIsLoading(false);
      }
  }, [userProfile, appSettings.pushNotifications]);

  const handleStartStoryCreation = useCallback((storyFile: File) => {
    closeProfileModal();
    handleAddStory(storyFile);
  }, [closeProfileModal, handleAddStory]);


  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    if (newSettings.pushNotifications && !appSettings.pushNotifications) {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              setAppSettings(newSettings);
              showNotification('Notificações Ativadas!', { body: 'Você agora receberá atualizações.' });
            }
          });
          return;
        } else if (Notification.permission === 'denied') {
          openNotificationHelpModal();
          return;
        }
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
      {userProfile && userProfile.stories && userProfile.stories.length > 0 && (
        <StoryViewerModal
            isOpen={isStoryViewerOpen}
            onClose={closeStoryViewer}
            stories={userProfile.stories}
            user={userProfile}
        />
      )}
    </div>
  );
}

export default App;
