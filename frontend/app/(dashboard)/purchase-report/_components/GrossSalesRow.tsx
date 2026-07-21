'use client';

import AmountInput from '@/app/(dashboard)/purchase-report/_components/AmountInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponseData } from '@/lib/api';
import { getWeeklyReportQueryKey, upsertGrossSalesEntry } from '@/lib/api/purchase';
import { formatCurrency } from '@/lib/formatter';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { toast } from 'sonner';

interface GrossSalesRowProps {
  storeId: string;
  weekStartDate: string;
  report: WeeklyReportData;
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const GrossSalesRow = ({ storeId, weekStartDate, report }: GrossSalesRowProps) => {
  const queryClient = useQueryClient();
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(weekStartDate).plus({ days: i }).toFormat('yyyy-LL-dd')
  );
  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveGrossSales } = useMutation({
    mutationFn: upsertGrossSalesEntry,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const grossSalesDaily = {
            ...old.data.gross_sales_daily,
            [variables.sales_date]: variables.amount,
          };
          const grossSalesTotal = Object.values(grossSalesDaily).reduce((a, b) => a + b, 0);
          return {
            ...old,
            data: { ...old.data, gross_sales_daily: grossSalesDaily, gross_sales_total: grossSalesTotal },
          };
        }
      );
    },
    onError: () => {
      toast.error('Failed to save gross sales');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Gross Sales</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {dayLabels.map((label) => (
                <TableHead key={label} className="text-right">
                  {label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {weekDates.map((date) => (
                <TableCell key={date} className="text-right">
                  <AmountInput
                    value={report.gross_sales_daily[date] || 0}
                    onSave={(amount) =>
                      saveGrossSales({ store_id: storeId, sales_date: date, amount })
                    }
                  />
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold">
                {formatCurrency(report.gross_sales_total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default GrossSalesRow;
