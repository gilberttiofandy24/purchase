'use client';

import SupplierDialog from '@/app/(dashboard)/store/[id]/supplier/_components/SupplierDialog';
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
import {
  deleteSupplier,
  getSuppliers,
  getSuppliersQueryKey,
} from '@/lib/api/supplier';
import { Supplier } from '@/schema/supplier/supplierSchema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';

interface SupplierPageProps {
  params: Promise<{ id: string }>;
}

const SupplierPage = ({ params }: SupplierPageProps) => {
  const { id: storeId } = use(params);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getSuppliersQueryKey(storeId),
    queryFn: () => getSuppliers(storeId),
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getSuppliersQueryKey(storeId) });
      toast.success('Supplier dihapus');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onEdit = (supplier: Supplier) => {
    setEditData(supplier);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <SupplierDialog
        storeId={storeId}
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
            <AlertDialogTitle>Hapus supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Supplier &quot;{deleteTarget?.name}&quot; beserta seluruh data pembelian yang
              tercatat untuk supplier ini akan dihapus permanen. Tindakan ini tidak bisa
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => deleteTarget && doDelete(deleteTarget.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Supplier</h1>
          <p className="text-sm text-muted-foreground">Kelola daftar supplier untuk toko ini.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/store">Kembali ke Toko</Link>
          </Button>
          <Button
            onClick={() => {
              setEditData(null);
              setDialogOpen(true);
            }}
          >
            Tambah Supplier
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : data?.data.length ? (
              data.data.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.is_active ? 'default' : 'destructive'}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(supplier)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(supplier)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Belum ada supplier.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SupplierPage;
