import API from './axios';

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
  role?: 'student' | 'admin';
}

export const registerUser = (data: AuthPayload) => API.post('/auth/register', data);
export const loginUser    = (data: AuthPayload) => API.post('/auth/login', data);
export const getMe        = ()                  => API.get('/auth/me');
