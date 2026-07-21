'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/lib/api';
import { createStore, getStoresQueryKey, updateStore } from '@/lib/api/store';
import {
  CreateStoreFormValues,
  Store,
  createStoreSchema,
} from '@/schema/store/storeSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface StoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: Store | null;
}

const defaultValues: CreateStoreFormValues = {
  name: '',
  is_active: true,
};

const StoreDialog = ({ isOpen, onClose, editData }: StoreDialogProps) => {
  const queryClient = useQueryClient();
  const isEdit = !!editData;

  const form = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      form.reset({ name: editData.name, is_active: editData.is_active });
    } else {
      form.reset(defaultValues);
    }
  }, [editData, isOpen, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: CreateStoreFormValues) => {
      if (isEdit && editData) {
        await updateStore(editData.id, values);
      } else {
        await createStore({ name: values.name });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getStoresQueryKey() });
      toast.success(isEdit ? 'Store updated' : 'Store created');
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Store' : 'Add Store'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pagewood" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreDialog;
