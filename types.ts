
export interface User {
  name: string;
  avatarUrl: string;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  created_at?: string;
  post_id?: string;
}

export interface Post {
  id:string;
  user: User;
  user_id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  liked?: boolean;
  commentList?: Comment[];
  created_at?: string;
}

export interface Story {
  id: string;
  imageUrl: string;
  createdAt: string;
  user: User;
}

export interface UserProfile extends User {
  id: string;
  bio: string;
  stories?: Story[];
}

export interface NewPost {
    caption: string;
    imageFile: File;
}

export interface AppSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  showLiveSessions: boolean;
}

// FIX: Add missing MusicTrack interface
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  track_url: string;
}
