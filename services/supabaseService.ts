
import { createClient } from '@supabase/supabase-js';
import type { Post, Comment, UserProfile, User, NewPost, Story, LiveSession, LiveComment, LiveSessionWithHost } from '../types';

const supabaseUrl = 'https://ndkpltjwevefwnnhiiqv.supabase.co';
const supabaseAnonKey = 'sb_publishable_3WEoDUcdTyaf3ZdWCQjVeA_I3htXKHw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StoryFromSupabase {
    id: string;
    image_url: string;
    created_at: string;
}

export const formatPost = (post: any): Post => ({
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
    stories: [],
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

    const user: User = { name: data.name, avatarUrl: data.avatar_url };

    const profile: UserProfile = {
        id: data.id,
        name: data.name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        stories: (data.stories as StoryFromSupabase[]).map(story => ({
            id: story.id,
            imageUrl: story.image_url,
            createdAt: story.created_at,
            user: user,
        }))
    };

    return profile;
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
            user_id: user.id,
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

export const deletePost = async (postId: string, imageUrl: string): Promise<boolean> => {
    // 1. Delete associated comments
    const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('post_id', postId);

    if (commentsError) {
        console.error('Error deleting comments:', commentsError.message);
        return false;
    }

    // 2. Delete the post
    const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

    if (postError) {
        console.error('Error deleting post:', postError.message);
        return false;
    }

    // 3. Delete image from storage
    try {
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
            const { error: storageError } = await supabase.storage.from('posts').remove([fileName]);
            if (storageError) {
                // Log the error but don't fail the whole operation, as the DB part is more critical.
                console.error('Error deleting image from storage:', storageError.message);
            }
        }
    } catch (e) {
        console.error('Error parsing image URL for deletion:', e);
    }

    return true;
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

export const addStory = async (userId: string, storyFile: File, user: User): Promise<Story | null> => {
    const storyUrl = await uploadFile('stories', storyFile);
    if (!storyUrl) return null;

    const { data, error } = await supabase
        .from('stories')
        .insert({
            user_id: userId,
            image_url: storyUrl,
        })
        .select(`*`)
        .single();
    
    if(error) {
        console.error('Error adding story:', error.message);
        return null;
    }
    
    return {
        id: data.id,
        imageUrl: data.image_url,
        createdAt: data.created_at,
        user: user,
    };
};


// Live Audio Session Functions

export const getActiveLiveSessions = async (): Promise<LiveSessionWithHost[]> => {
    const { data, error } = await supabase
        .from('live_sessions')
        .select(`
            *,
            host:profiles(name, avatar_url)
        `)
        .eq('is_live', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching active live sessions:', error.message);
        return [];
    }

    return data.map((session: any) => ({
        id: session.id,
        host_id: session.host_id,
        is_live: session.is_live,
        created_at: session.created_at,
        host: {
            name: session.host.name,
            avatarUrl: session.host.avatar_url
        }
    }));
};

export const getLiveSessionById = async (sessionId: string): Promise<LiveSessionWithHost | null> => {
    const { data, error } = await supabase
        .from('live_sessions')
        .select(`
            *,
            host:profiles(name, avatar_url)
        `)
        .eq('id', sessionId)
        .eq('is_live', true)
        .single();

    if (error || !data || !data.host) {
        return null;
    }
    
    const hostData = Array.isArray(data.host) ? data.host[0] : data.host;

    return {
        id: data.id,
        host_id: data.host_id,
        is_live: data.is_live,
        created_at: data.created_at,
        host: {
            name: hostData.name,
            avatarUrl: hostData.avatar_url
        }
    };
};


export const createLiveSession = async (hostId: string): Promise<LiveSession | null> => {
    const { data, error } = await supabase
        .from('live_sessions')
        .insert({ host_id: hostId, is_live: true })
        .select()
        .single();

    if (error) {
        console.error('Error creating live session:', error.message);
        return null;
    }
    return data;
};

export const endLiveSession = async (sessionId: string) => {
    const { error } = await supabase
        .from('live_sessions')
        .update({ is_live: false })
        .eq('id', sessionId);
    
    if (error) {
        console.error('Error ending live session:', error.message);
    }
};

export const addLiveComment = async (sessionId: string, user: User, text: string): Promise<LiveComment | null> => {
    const { data, error } = await supabase
        .from('live_comments')
        .insert({
            session_id: sessionId,
            user_name: user.name,
            user_avatar_url: user.avatarUrl,
            text
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error adding live comment:', error.message);
        return null;
    }

    return {
        id: data.id,
        session_id: data.session_id,
        text: data.text,
        created_at: data.created_at,
        user: {
            name: data.user_name,
            avatarUrl: data.user_avatar_url
        }
    };
};
