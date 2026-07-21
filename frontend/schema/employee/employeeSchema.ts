import { z } from 'zod';

export type Employee = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Nama karyawan wajib diisi'),
  is_active: z.boolean(),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
