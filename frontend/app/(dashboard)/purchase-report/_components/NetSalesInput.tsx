'use client';

import AmountInput from '@/app/(dashboard)/purchase-report/_components/AmountInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponseData } from '@/lib/api';
import { getWeeklyReportQueryKey, upsertNetSales } from '@/lib/api/purchase';
import { formatCurrency } from '@/lib/formatter';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NetSalesInputProps {
  storeId: string;
  weekStartDate: string;
  netSales: number;
  purchaseRatioPct: number;
}

const NetSalesInput = ({
  storeId,
  weekStartDate,
  netSales,
  purchaseRatioPct,
}: NetSalesInputProps) => {
  const queryClient = useQueryClient();
  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveNetSales } = useMutation({
    mutationFn: upsertNetSales,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const ratio =
            variables.amount > 0 ? (old.data.grand_total_purchase / variables.amount) * 100 : 0;
          return {
            ...old,
            data: { ...old.data, net_sales: variables.amount, purchase_ratio_pct: ratio },
          };
        }
      );
    },
    onError: () => {
      toast.error('Failed to save net sales');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Net Sales</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <AmountInput
            value={netSales}
            onSave={(amount) =>
              saveNetSales({ store_id: storeId, week_start_date: weekStartDate, amount })
            }
          />
          <span className="text-sm text-muted-foreground">{formatCurrency(netSales)}</span>
        </div>
        <div className="text-sm">
          Purchase Ratio: <span className="font-semibold">{purchaseRatioPct.toFixed(2)}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetSalesInput;
