'use client';

import AmountInput from '@/app/(dashboard)/purchase-report/_components/AmountInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponseData } from '@/lib/api';
import { getWeeklyReportQueryKey, upsertLabourRate } from '@/lib/api/purchase';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LabourRateInputProps {
  storeId: string;
  weekStartDate: string;
  weekdayRate: number;
  weekendRate: number;
}

const LabourRateInput = ({
  storeId,
  weekStartDate,
  weekdayRate,
  weekendRate,
}: LabourRateInputProps) => {
  const queryClient = useQueryClient();
  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveRate } = useMutation({
    mutationFn: upsertLabourRate,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const labourDaily = Object.fromEntries(
            Object.entries(old.data.labour_daily).map(([date, info]) => {
              const rate = info.is_weekend ? variables.weekend_rate : variables.weekday_rate;
              return [date, { ...info, labour_cost: info.total_hours * rate }];
            })
          );
          const labourTotal = Object.values(labourDaily).reduce((a, d) => a + d.labour_cost, 0);
          const labourCostPct =
            old.data.net_sales_from_gross > 0
              ? (labourTotal / old.data.net_sales_from_gross) * 100
              : 0;
          return {
            ...old,
            data: {
              ...old.data,
              weekday_rate: variables.weekday_rate,
              weekend_rate: variables.weekend_rate,
              labour_daily: labourDaily,
              labour_total: labourTotal,
              labour_cost_pct: labourCostPct,
            },
          };
        }
      );
    },
    onError: () => {
      toast.error('Gagal menyimpan gross rate');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gross Rate Minggu Ini</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Weekday</span>
          <AmountInput
            value={weekdayRate}
            onSave={(amount) =>
              saveRate({
                store_id: storeId,
                week_start_date: weekStartDate,
                weekday_rate: amount,
                weekend_rate: weekendRate,
              })
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Weekend</span>
          <AmountInput
            value={weekendRate}
            onSave={(amount) =>
              saveRate({
                store_id: storeId,
                week_start_date: weekStartDate,
                weekday_rate: weekdayRate,
                weekend_rate: amount,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LabourRateInput;
