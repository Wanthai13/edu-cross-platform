export interface User {
  _id?: string;
  username: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'github' | 'google' | 'discord';
  role: 'student' | 'employee' | 'teacher' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'student' | 'employee' | 'teacher' | 'admin';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: Omit<User, 'passwordHash'>;
}