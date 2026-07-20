import { api, ResponseData } from '@/lib/api';

export type LoginPayload = {
  username: string;
  password: string;
};

export const login = async (data: LoginPayload): Promise<ResponseData<{ username: string }>> => {
  return await api.post('/login', data);
};

export const logout = async (): Promise<void> => {
  await api.post('/logout');
};

export const getMeQueryKey = () => ['me'];

export const getMe = async (): Promise<ResponseData<{ username: string }>> => {
  return await api.get('/me');
};
