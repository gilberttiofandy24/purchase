'use client';

import StoreDialog from '@/app/(dashboard)/store/_components/StoreDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { deleteStore, getStores, getStoresQueryKey } from '@/lib/api/store';
import { Store } from '@/schema/store/storeSchema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const StorePage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getStoresQueryKey(),
    queryFn: getStores,
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getStoresQueryKey() });
      toast.success('Store deleted');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onEdit = (store: Store) => {
    setEditData(store);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <StoreDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditData(null);
        }}
        editData={editData}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store?</AlertDialogTitle>
            <AlertDialogDescription>
              Store &quot;{deleteTarget?.name}&quot; and all its recorded data (suppliers,
              employees, purchases, sales, and labour) will be permanently deleted. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => deleteTarget && doDelete(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Stores</h1>
          <p className="text-sm text-muted-foreground">Manage the list of stores/branches.</p>
        </div>
        <Button
          onClick={() => {
            setEditData(null);
            setDialogOpen(true);
          }}
        >
          Add Store
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.data.length ? (
              data.data.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>
                    <Badge variant={store.is_active ? 'default' : 'destructive'}>
                      {store.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/store/${store.id}/supplier`}>Manage Suppliers</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/store/${store.id}/employee`}>Manage Employees</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(store)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(store)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No stores yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default StorePage;
