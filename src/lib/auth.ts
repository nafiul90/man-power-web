export interface User {
  _id: string;
  fullName: string;
  phone: string;
  nidNumber?: string;
  email?: string;
  gender?: string;
  role: string;
  isActive: boolean;
  org?: string | { _id: string; title: string } | null;
  createdAt: string;
}

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setAuth = (token: string, user: User) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => !!getToken();
