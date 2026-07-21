'use client';

import AmountInput from '@/app/(dashboard)/purchase-report/_components/AmountInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponseData } from '@/lib/api';
import { getWeeklyReportQueryKey, upsertPurchaseEntry } from '@/lib/api/purchase';
import { createSupplier, getSuppliersQueryKey } from '@/lib/api/supplier';
import { formatCurrency } from '@/lib/formatter';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { toast } from 'sonner';

interface PurchaseGridProps {
  storeId: string;
  weekStartDate: string;
  report: WeeklyReportData;
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PurchaseGrid = ({ storeId, weekStartDate, report }: PurchaseGridProps) => {
  const queryClient = useQueryClient();
  const [newSupplierName, setNewSupplierName] = useState('');

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(weekStartDate).plus({ days: i }).toFormat('yyyy-LL-dd')
  );

  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveEntry } = useMutation({
    mutationFn: upsertPurchaseEntry,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const suppliers = old.data.suppliers.map((s) => {
            if (s.supplier_id !== variables.supplier_id) return s;
            const daily = { ...s.daily_amounts, [variables.purchase_date]: variables.amount };
            const total = Object.values(daily).reduce((a, b) => a + b, 0);
            return { ...s, daily_amounts: daily, total };
          });
          const grandTotal = suppliers.reduce((a, s) => a + s.total, 0);
          const withPct = suppliers.map((s) => ({
            ...s,
            percentage_of_all: grandTotal > 0 ? (s.total / grandTotal) * 100 : 0,
          }));
          return {
            ...old,
            data: {
              ...old.data,
              suppliers: withPct,
              grand_total_purchase: grandTotal,
              purchase_ratio_pct:
                old.data.net_sales > 0 ? (grandTotal / old.data.net_sales) * 100 : 0,
            },
          };
        }
      );
    },
    onError: () => {
      toast.error('Failed to save purchase data');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  const { mutate: addSupplier, isPending: isAddingSupplier } = useMutation({
    mutationFn: (name: string) => createSupplier(storeId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getSuppliersQueryKey(storeId) });
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
      setNewSupplierName('');
    },
    onError: () => {
      toast.error('Failed to add supplier');
    },
  });

  return (
    <div className="w-full overflow-auto rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            {dayLabels.map((label) => (
              <TableHead key={label} className="text-right">
                {label}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.suppliers.map((supplier) => (
            <TableRow key={supplier.supplier_id}>
              <TableCell>{supplier.supplier_name}</TableCell>
              {weekDates.map((date) => (
                <TableCell key={date} className="text-right">
                  <AmountInput
                    value={supplier.daily_amounts[date] || 0}
                    onSave={(amount) =>
                      saveEntry({
                        store_id: storeId,
                        supplier_id: supplier.supplier_id,
                        purchase_date: date,
                        amount,
                      })
                    }
                  />
                </TableCell>
              ))}
              <TableCell className="text-right font-medium">
                {formatCurrency(supplier.total)}
              </TableCell>
              <TableCell className="text-right">
                {supplier.percentage_of_all.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={dayLabels.length + 3}>
              <div className="flex items-center gap-2 py-2">
                <Input
                  placeholder="New supplier name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!newSupplierName.trim() || isAddingSupplier}
                  onClick={() => addSupplier(newSupplierName.trim())}
                >
                  Add Supplier
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow className="bg-muted/30 font-semibold">
            <TableCell>Grand Total</TableCell>
            <TableCell colSpan={7} />
            <TableCell className="text-right">
              {formatCurrency(report.grand_total_purchase)}
            </TableCell>
            <TableCell className="text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default PurchaseGrid;
