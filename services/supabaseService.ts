
import { createClient } from '@supabase/supabase-js';
import type { Post, Comment, UserProfile, User, NewPost, Story, LiveSession } from '../types';

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

export const formatComment = (comment: any): Comment => ({
    id: comment.id,
    text: comment.text,
    created_at: comment.created_at,
    user: {
        name: comment.user_name,
        avatarUrl: comment.user_avatar_url
    },
    post_id: comment.post_id
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
        .order('created_at', { ascending: true });
    
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

const deleteFile = async (bucket: string, fileUrl: string) => {
    try {
        const fileName = fileUrl.split('/').pop();
        if (fileName) {
            const { error: storageError } = await supabase.storage.from(bucket).remove([fileName]);
            if (storageError) {
                console.error(`Error deleting image from ${bucket}:`, storageError.message);
            }
        }
    } catch (e) {
        console.error('Error parsing image URL for deletion:', e);
    }
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
    await deleteFile('posts', imageUrl);

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

export const updateUserProfilePicture = async (userId: string, imageFile: File, oldAvatarUrl: string): Promise<string | null> => {
    const newAvatarUrl = await uploadFile('avatars', imageFile);
    if (!newAvatarUrl) return null;

    const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId)
        .select('avatar_url')
        .single();
    
    if (error) {
        console.error('Error updating profile picture URL:', error.message);
        // If DB update fails, delete the newly uploaded file to prevent orphans
        await deleteFile('avatars', newAvatarUrl);
        return null;
    }
    
    // Delete old avatar from storage
    if (oldAvatarUrl && !oldAvatarUrl.includes('default-avatar.png')) {
        await deleteFile('avatars', oldAvatarUrl);
    }
    
    // Also update existing posts and comments with the new avatar url for consistency
    await supabase.from('posts').update({ user_avatar_url: newAvatarUrl }).eq('user_id', userId);
    // Note: comments table lacks user_id, so we update based on name, which is not ideal but the best we can do.
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', userId).single();
    if(profile) {
       await supabase.from('comments').update({ user_avatar_url: newAvatarUrl }).eq('user_name', profile.name);
    }
    
    return data?.avatar_url ?? null;
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

// Mock function for live sessions
export const getActiveLiveSessions = async (): Promise<LiveSession[]> => {
    console.log("Fetching mock active live sessions...");
    const host1 = { id: 'user_2', name: 'Ana', avatarUrl: 'https://i.pravatar.cc/150?u=ana', isHost: true, isSpeaker: true };
    const host2 = { id: 'user_3', name: 'Carlos', avatarUrl: 'https://i.pravatar.cc/150?u=carlos', isHost: true, isSpeaker: true };
    
    return Promise.resolve([
        {
            id: 'live_1',
            title: 'Discussão sobre IA e Criatividade',
            host: host1,
            speakers: [host1],
            listeners: [],
            likes: 0,
            chat: [],
        },
        {
            id: 'live_2',
            title: 'Música ao vivo e bate-papo',
            host: host2,
            speakers: [host2],
            listeners: [],
            likes: 0,
            chat: [],
        },
    ]);
};
