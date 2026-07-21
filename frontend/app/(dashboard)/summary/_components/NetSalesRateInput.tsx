'use client';

import AmountInput from '@/app/(dashboard)/purchase-report/_components/AmountInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponseData } from '@/lib/api';
import { getWeeklyReportQueryKey, upsertNetSalesRate } from '@/lib/api/purchase';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NetSalesRateInputProps {
  storeId: string;
  weekStartDate: string;
  rate: number;
}

const NetSalesRateInput = ({ storeId, weekStartDate, rate }: NetSalesRateInputProps) => {
  const queryClient = useQueryClient();
  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveRate } = useMutation({
    mutationFn: upsertNetSalesRate,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const netSales = old.data.gross_sales_total * variables.rate;
          const purchaseRatioPct =
            netSales > 0 ? (old.data.grand_total_purchase / netSales) * 100 : 0;
          const labourCostPct = netSales > 0 ? (old.data.labour_total / netSales) * 100 : 0;
          return {
            ...old,
            data: {
              ...old.data,
              net_sales: netSales,
              net_sales_rate: variables.rate,
              purchase_ratio_pct: purchaseRatioPct,
              labour_cost_pct: labourCostPct,
            },
          };
        }
      );
    },
    onError: () => {
      toast.error('Failed to save net sales rate');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Sales Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Net Sales = Gross Sales ×</span>
        <AmountInput
          value={rate}
          onSave={(amount) =>
            saveRate({ store_id: storeId, week_start_date: weekStartDate, rate: amount })
          }
        />
      </CardContent>
    </Card>
  );
};

export default NetSalesRateInput;
