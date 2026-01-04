
import { createClient } from '@supabase/supabase-js';
import type { Post, Comment, UserProfile, User, NewPost, Story, MusicTrack } from '../types';

const supabaseUrl = 'https://ndkpltjwevefwnnhiiqv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ka3BsdGp3ZXZlZndubmhpaXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk3ODg4MzcsImV4cCI6MjAxNTM2NDgzN30.8p35aJ0soxI_tT2c-yM5-G3e_3Gf_o_fsIif2v4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StoryFromSupabase {
    id: string;
    image_url: string;
    created_at: string;
}

export const formatPost = (post: any): Post => {
    return {
        id: post.id,
        user_id: post.user_id,
        caption: post.caption,
        imageUrl: post.image_url,
        likes: post.likes,
        comments: post.comments_count,
        created_at: post.created_at,
        user: {
            name: post.user_name,
            avatarUrl: post.user_avatar_url
        },
    };
};

const formatProfile = (profile: any): UserProfile => {
    return {
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        stories: [],
    };
};

const formatComment = (comment: any): Comment => ({
    id: comment.id,
    post_id: comment.post_id,
    text: comment.text,
    created_at: comment.created_at,
    user: {
        name: comment.user_name,
        avatarUrl: comment.user_avatar_url,
    },
});

export const getPosts = async () => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error.message);
        return [];
    }
    return data.map(formatPost);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            stories (id, image_url, created_at)
        `)
        .eq('id', userId)
        .order('created_at', { referencedTable: 'stories', ascending: true })
        .single();
    
    if (error) {
        console.error('Error fetching profile and stories:', error.message);
        return null;
    }

    const profile = formatProfile(data);
    const user: User = { name: data.name, avatarUrl: data.avatar_url };

    profile.stories = (data.stories as StoryFromSupabase[]).map(story => ({
        id: story.id,
        imageUrl: story.image_url,
        createdAt: story.created_at,
        user: user,
    }));
    
    return profile;
};

export const getCommentsForPost = async (postId: string) => {
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) { console.error('Error fetching comments:', error.message); return []; }
    return data.map(formatComment);
};

const uploadFile = async (bucket: string, file: File) => {
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) { console.error(`Error uploading file to ${bucket}:`, uploadError.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
};

const deleteFile = async (bucket: string, fileUrl: string) => {
    try {
        const fileName = fileUrl.split('/').pop();
        if (fileName) {
            const { error: storageError } = await supabase.storage.from(bucket).remove([fileName]);
            if (storageError) { console.error(`Error deleting image from ${bucket}:`, storageError.message); }
        }
    } catch (e) { console.error('Error parsing image URL for deletion:', e); }
};

export const createPost = async (postData: NewPost, user: UserProfile) => {
    const imageUrl = await uploadFile('posts', postData.imageFile);
    if (!imageUrl) return null;
    const { data, error } = await supabase.from('posts').insert({ user_id: user.id, caption: postData.caption, image_url: imageUrl, user_name: user.name, user_avatar_url: user.avatarUrl, likes: 0, comments_count: 0 }).select().single();
    if (error) { console.error('Error creating post:', error.message); return null; }
    return formatPost(data);
};

export const deletePost = async (postId: string, imageUrl: string): Promise<boolean> => {
    await supabase.from('comments').delete().eq('post_id', postId);
    const { error: postError } = await supabase.from('posts').delete().eq('id', postId);
    if (postError) { console.error('Error deleting post:', postError.message); return false; }
    await deleteFile('posts', imageUrl);
    return true;
};

export const addComment = async (postId: string, text: string, user: User) => {
    const { data, error } = await supabase.from('comments').insert({ post_id: postId, text, user_name: user.name, user_avatar_url: user.avatarUrl }).select().single();
    if (error) { console.error('Error adding comment:', error.message); return null; }
    await supabase.rpc('increment_comments_count', { post_id_to_update: postId });
    return formatComment(data);
};

export const toggleLike = async (postId: string, newLikesCount: number) => {
    const { data, error } = await supabase.from('posts').update({ likes: newLikesCount }).eq('id', postId).select().single();
    if(error) { console.error('Error toggling like:', error.message); return null; }
    return formatPost(data);
};

export const updateUserProfile = async (userId: string, profileData: Pick<UserProfile, 'name' | 'bio'>) => {
     const { data, error } = await supabase.from('profiles').update({ name: profileData.name, bio: profileData.bio }).eq('id', userId).select().single();
    if(error) { console.error('Error updating profile:', error.message); return null; }
    return formatProfile(data);
};

export const updateUserProfilePicture = async (userId: string, imageFile: File, oldAvatarUrl: string): Promise<string | null> => {
    const newAvatarUrl = await uploadFile('avatars', imageFile);
    if (!newAvatarUrl) return null;
    const { data, error } = await supabase.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', userId).select('avatar_url').single();
    if (error) { console.error('Error updating profile picture URL:', error.message); await deleteFile('avatars', newAvatarUrl); return null; }
    if (oldAvatarUrl && !oldAvatarUrl.includes('default-avatar.png')) { await deleteFile('avatars', oldAvatarUrl); }
    await supabase.from('posts').update({ user_avatar_url: newAvatarUrl }).eq('user_id', userId);
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', userId).single();
    if(profile) { await supabase.from('comments').update({ user_avatar_url: newAvatarUrl }).eq('user_name', profile.name); }
    return data?.avatar_url ?? null;
};

export const addStory = async (userId: string, storyFile: File, user: User, musicTrack: MusicTrack): Promise<Story | null> => {
    const storyUrl = await uploadFile('stories', storyFile);
    if (!storyUrl) return null;
    // In a real app, you would store musicTrack info in the database.
    // Here we just add it to the returned object for client-side use.
    const { data, error } = await supabase.from('stories').insert({ user_id: userId, image_url: storyUrl }).select(`*`).single();
    if(error) { console.error('Error adding story:', error.message); return null; }
    return { id: data.id, imageUrl: data.image_url, createdAt: data.created_at, user: user, musicTrack };
};

// Saved Posts (using localStorage for simulation)
export const getSavedPostIds = (): string[] => JSON.parse(localStorage.getItem('saved_posts') || '[]');
export const savePost = (postId: string) => localStorage.setItem('saved_posts', JSON.stringify([...getSavedPostIds(), postId]));
export const unsavePost = (postId: string) => localStorage.setItem('saved_posts', JSON.stringify(getSavedPostIds().filter(id => id !== postId)));