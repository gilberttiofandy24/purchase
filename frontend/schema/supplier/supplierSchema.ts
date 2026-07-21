import { z } from 'zod';

export type Supplier = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  is_active: z.boolean(),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;
