import { api, ResponseData } from '@/lib/api';
import { Store } from '@/schema/store/storeSchema';

export const getStoresQueryKey = () => ['stores'];

export const getStores = async (): Promise<ResponseData<Store[]>> => {
  return await api.get('/store');
};

export const createStore = async (data: { name: string }): Promise<void> => {
  await api.post('/store', data);
};

export const updateStore = async (
  id: string,
  data: { name?: string; is_active?: boolean }
): Promise<void> => {
  await api.put(`/store/${id}`, data);
};

export const deleteStore = async (id: string): Promise<void> => {
  await api.delete(`/store/${id}`);
};
