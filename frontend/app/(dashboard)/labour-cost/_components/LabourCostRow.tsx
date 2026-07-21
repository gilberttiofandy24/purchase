'use client';

import LabourDayCell from '@/app/(dashboard)/labour-cost/_components/LabourDayCell';
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
import { getWeeklyReportQueryKey, upsertLabourEntry } from '@/lib/api/purchase';
import { formatCurrency } from '@/lib/formatter';
import { LabourDayInfo, WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { toast } from 'sonner';

interface LabourCostRowProps {
  storeId: string;
  weekStartDate: string;
  report: WeeklyReportData;
}

const dayLabels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const weekdayRate = 33.05;
const weekendRate = 39.66;
const superMultiplier = 1.12;

function labourCostFor(date: string, totalHours: number): number {
  const isWeekend = DateTime.fromISO(date).weekday >= 6;
  const rate = isWeekend ? weekendRate : weekdayRate;
  return totalHours * rate * superMultiplier;
}

const LabourCostRow = ({ storeId, weekStartDate, report }: LabourCostRowProps) => {
  const queryClient = useQueryClient();
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(weekStartDate).plus({ days: i }).toFormat('yyyy-LL-dd')
  );
  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveLabour } = useMutation({
    mutationFn: upsertLabourEntry,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;
          const cost = labourCostFor(variables.entry_date, variables.total_hours);
          const existing: LabourDayInfo | undefined = old.data.labour_daily[variables.entry_date];
          const labourDaily = {
            ...old.data.labour_daily,
            [variables.entry_date]: {
              staff_count: variables.staff_count,
              total_hours: variables.total_hours,
              labour_cost: cost,
              is_weekend: existing?.is_weekend ?? DateTime.fromISO(variables.entry_date).weekday >= 6,
            },
          };
          const labourTotal = Object.values(labourDaily).reduce((a, d) => a + d.labour_cost, 0);
          const labourCostPct =
            old.data.net_sales_from_gross > 0
              ? (labourTotal / old.data.net_sales_from_gross) * 100
              : 0;
          return {
            ...old,
            data: { ...old.data, labour_daily: labourDaily, labour_total: labourTotal, labour_cost_pct: labourCostPct },
          };
        }
      );
    },
    onError: () => {
      toast.error('Gagal menyimpan data labour');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labour Cost</CardTitle>
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
              {weekDates.map((date) => {
                const info = report.labour_daily[date];
                return (
                  <TableCell key={date} className="text-right align-top">
                    <LabourDayCell
                      key={`${info?.staff_count ?? 0}-${info?.total_hours ?? 0}`}
                      staffCount={info?.staff_count ?? 0}
                      totalHours={info?.total_hours ?? 0}
                      onSave={(staffCount, totalHours) =>
                        saveLabour({
                          store_id: storeId,
                          entry_date: date,
                          staff_count: staffCount,
                          total_hours: totalHours,
                        })
                      }
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(info?.labour_cost ?? 0)}
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-semibold align-top">
                {formatCurrency(report.labour_total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-col gap-1 text-sm">
          <div>
            Net Sales (dari Gross Sales ÷ 1.10):{' '}
            <span className="font-medium">{formatCurrency(report.net_sales_from_gross)}</span>
          </div>
          <div>
            Labour Cost %:{' '}
            <span className="font-semibold">{report.labour_cost_pct.toFixed(2)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LabourCostRow;
