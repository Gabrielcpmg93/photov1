
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
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  liked?: boolean;
  commentList?: Comment[];
  created_at?: string;
}

export interface UserProfile extends User {
  id: string;
  bio: string;
  storyUrl?: string | null;
}

export interface NewPost {
    caption: string;
    imageFile: File;
}

export interface AppSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
