'use client';

import StoreDialog from '@/app/(dashboard)/store/_components/StoreDialog';
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
import { getStores, getStoresQueryKey } from '@/lib/api/store';
import { Store } from '@/schema/store/storeSchema';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const StorePage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Store | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getStoresQueryKey(),
    queryFn: getStores,
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Toko</h1>
          <p className="text-sm text-muted-foreground">Kelola daftar toko/cabang.</p>
        </div>
        <Button
          onClick={() => {
            setEditData(null);
            setDialogOpen(true);
          }}
        >
          Tambah Toko
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Toko</TableHead>
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
                      <Link href={`/store/${store.id}/supplier`}>Kelola Supplier</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/store/${store.id}/employee`}>Kelola Karyawan</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(store)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Belum ada toko.
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
