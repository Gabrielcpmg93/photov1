
export interface User {
  name: string;
  avatarUrl: string;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
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
}

export interface UserProfile extends User {
  bio: string;
}

export interface AppSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
