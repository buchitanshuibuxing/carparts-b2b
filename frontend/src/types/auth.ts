export interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions?: Permission[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
