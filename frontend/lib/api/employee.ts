import { api, ResponseData } from '@/lib/api';
import { Employee } from '@/schema/employee/employeeSchema';

export const getEmployeesQueryKey = (storeId: string) => ['store', storeId, 'employees'];

export const getEmployees = async (storeId: string): Promise<ResponseData<Employee[]>> => {
  return await api.get(`/store/${storeId}/employee`);
};

export const createEmployee = async (storeId: string, data: { name: string }): Promise<void> => {
  await api.post(`/store/${storeId}/employee`, data);
};

export const updateEmployee = async (
  id: string,
  data: { name?: string; sort_order?: number; is_active?: boolean }
): Promise<void> => {
  await api.put(`/employee/${id}`, data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await api.delete(`/employee/${id}`);
};
