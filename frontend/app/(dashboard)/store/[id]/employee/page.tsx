'use client';

import EmployeeDialog from '@/app/(dashboard)/store/[id]/employee/_components/EmployeeDialog';
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
  deleteEmployee,
  getEmployees,
  getEmployeesQueryKey,
} from '@/lib/api/employee';
import { Employee } from '@/schema/employee/employeeSchema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';

interface EmployeePageProps {
  params: Promise<{ id: string }>;
}

const EmployeePage = ({ params }: EmployeePageProps) => {
  const { id: storeId } = use(params);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getEmployeesQueryKey(storeId),
    queryFn: () => getEmployees(storeId),
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getEmployeesQueryKey(storeId) });
      toast.success('Karyawan dihapus');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onEdit = (employee: Employee) => {
    setEditData(employee);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <EmployeeDialog
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
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Karyawan &quot;{deleteTarget?.name}&quot; beserta seluruh data jam kerja yang
              tercatat untuk karyawan ini akan dihapus permanen. Tindakan ini tidak bisa
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
          <h1 className="text-lg font-semibold">Karyawan</h1>
          <p className="text-sm text-muted-foreground">Kelola daftar karyawan untuk toko ini.</p>
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
            Tambah Karyawan
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
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
              data.data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? 'default' : 'destructive'}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(employee)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Belum ada karyawan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default EmployeePage;
