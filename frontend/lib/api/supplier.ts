import { api, ResponseData } from '@/lib/api';
import { Supplier } from '@/schema/supplier/supplierSchema';

export const getSuppliersQueryKey = (storeId: string) => ['store', storeId, 'suppliers'];

export const getSuppliers = async (storeId: string): Promise<ResponseData<Supplier[]>> => {
  return await api.get(`/store/${storeId}/supplier`);
};

export const createSupplier = async (storeId: string, data: { name: string }): Promise<void> => {
  await api.post(`/store/${storeId}/supplier`, data);
};

export const updateSupplier = async (
  id: string,
  data: { name?: string; sort_order?: number; is_active?: boolean }
): Promise<void> => {
  await api.put(`/supplier/${id}`, data);
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await api.delete(`/supplier/${id}`);
};
