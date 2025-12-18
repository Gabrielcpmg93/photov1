
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

export interface LiveSession {
  id: string;
  host_id: string;
  is_live: boolean;
  created_at: string;
}

export interface LiveSessionWithHost extends LiveSession {
    host: User;
}

export interface LiveComment {
    id: string;
    session_id: string;
    user: User;
    text: string;
    created_at: string;
}