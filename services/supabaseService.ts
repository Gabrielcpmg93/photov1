
import { createClient } from '@supabase/supabase-js';
import type { Post, Comment, UserProfile, User, NewPost } from '../types';

const supabaseUrl = 'https://ndkpltjwevefwnnhiiqv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ka3BsdGp3ZXZlZndubmhpaXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk0MjYyMjIsImV4cCI6MjAzNTAwMjIyMn0.6k5dws-n_yWR20sJ2c_F03H5J7nL5q-eT42nQMLTGjc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const formatPost = (post: any): Post => ({
    id: post.id,
    caption: post.caption,
    imageUrl: post.image_url,
    likes: post.likes,
    comments: post.comments_count,
    created_at: post.created_at,
    user: {
        name: post.user_name,
        avatarUrl: post.user_avatar_url
    }
});

const formatComment = (comment: any): Comment => ({
    id: comment.id,
    text: comment.text,
    created_at: comment.created_at,
    user: {
        name: comment.user_name,
        avatarUrl: comment.user_avatar_url
    }
});

const formatProfile = (profile: any): UserProfile => ({
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    storyUrl: profile.story_url,
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

export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
    }
    return formatProfile(data);
};

export const getCommentsForPost = async (postId: string) => {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching comments:', error.message);
        return [];
    }
    return data.map(formatComment);
};

const uploadFile = async (bucket: string, file: File) => {
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);

    if (uploadError) {
        console.error(`Error uploading file to ${bucket}:`, uploadError.message);
        return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
};


export const createPost = async (postData: NewPost, user: UserProfile) => {
    const imageUrl = await uploadFile('posts', postData.imageFile);
    if (!imageUrl) return null;

    const { data, error } = await supabase
        .from('posts')
        .insert({
            caption: postData.caption,
            image_url: imageUrl,
            user_name: user.name,
            user_avatar_url: user.avatarUrl,
            likes: 0,
            comments_count: 0,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating post:', error.message);
        return null;
    }

    return formatPost(data);
};

export const addComment = async (postId: string, text: string, user: User) => {
    const { data, error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            text,
            user_name: user.name,
            user_avatar_url: user.avatarUrl,
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error adding comment:', error.message);
        return null;
    }
    // Manually increment comments_count on the post
    await supabase.rpc('increment_comments_count', { post_id_to_update: postId });


    return formatComment(data);
};

export const toggleLike = async (postId: string, newLikesCount: number) => {
    const { data, error } = await supabase
        .from('posts')
        .update({ likes: newLikesCount })
        .eq('id', postId)
        .select()
        .single();
    
    if(error) {
        console.error('Error toggling like:', error.message);
        return null;
    }
    return formatPost(data);
};

export const updateUserProfile = async (userId: string, profileData: Pick<UserProfile, 'name' | 'bio'>) => {
     const { data, error } = await supabase
        .from('profiles')
        .update({ name: profileData.name, bio: profileData.bio })
        .eq('id', userId)
        .select()
        .single();
    
    if(error) {
        console.error('Error updating profile:', error.message);
        return null;
    }
    return formatProfile(data);
};

export const setStory = async (userId: string, storyFile: File) => {
    const storyUrl = await uploadFile('stories', storyFile);
    if (!storyUrl) return null;

    const { data, error } = await supabase
        .from('profiles')
        .update({ story_url: storyUrl })
        .eq('id', userId)
        .select()
        .single();
    
    if(error) {
        console.error('Error setting story:', error.message);
        return null;
    }
    return formatProfile(data);
};
