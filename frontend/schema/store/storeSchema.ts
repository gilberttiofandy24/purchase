import { z } from 'zod';

export type Store = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  is_active: z.boolean(),
});

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>;
