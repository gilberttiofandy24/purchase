'use client';

import HourInput from '@/app/(dashboard)/labour-cost/_components/HourInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { createEmployee, getEmployeesQueryKey } from '@/lib/api/employee';
import { getWeeklyReportQueryKey, upsertLabourHourEntry } from '@/lib/api/purchase';
import { formatCurrency } from '@/lib/formatter';
import { LabourDayInfo, WeeklyReportData } from '@/schema/purchase/purchaseSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { toast } from 'sonner';

interface LabourGridProps {
  storeId: string;
  weekStartDate: string;
  report: WeeklyReportData;
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function labourCostFor(
  date: string,
  totalHours: number,
  weekdayRate: number,
  weekendRate: number
): number {
  const isWeekend = DateTime.fromISO(date).weekday >= 6;
  const rate = isWeekend ? weekendRate : weekdayRate;
  return totalHours * rate;
}

const LabourGrid = ({ storeId, weekStartDate, report }: LabourGridProps) => {
  const queryClient = useQueryClient();
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(weekStartDate).plus({ days: i }).toFormat('yyyy-LL-dd')
  );

  const reportQueryKey = getWeeklyReportQueryKey({
    store_id: storeId,
    week_start_date: weekStartDate,
  });

  const { mutate: saveHours } = useMutation({
    mutationFn: upsertLabourHourEntry,
    onMutate: async (variables) => {
      queryClient.setQueryData<ResponseData<WeeklyReportData> | undefined>(
        reportQueryKey,
        (old) => {
          if (!old) return old;

          const employees = old.data.employees.map((e) => {
            if (e.employee_id !== variables.employee_id) return e;
            const dailyHours = { ...e.daily_hours, [variables.entry_date]: variables.total_hours };
            const totalHours = Object.values(dailyHours).reduce((a, b) => a + b, 0);
            return { ...e, daily_hours: dailyHours, total_hours: totalHours };
          });
          const weekTotalHours = employees.reduce((a, e) => a + e.total_hours, 0);
          const withPct = employees.map((e) => ({
            ...e,
            percentage_of_all: weekTotalHours > 0 ? (e.total_hours / weekTotalHours) * 100 : 0,
          }));

          const dayTotalHours = withPct.reduce(
            (a, e) => a + (e.daily_hours[variables.entry_date] || 0),
            0
          );
          const staffCount = withPct.filter(
            (e) => (e.daily_hours[variables.entry_date] || 0) > 0
          ).length;
          const cost = labourCostFor(
            variables.entry_date,
            dayTotalHours,
            old.data.weekday_rate,
            old.data.weekend_rate
          );
          const existing: LabourDayInfo | undefined = old.data.labour_daily[variables.entry_date];
          const labourDaily = {
            ...old.data.labour_daily,
            [variables.entry_date]: {
              staff_count: staffCount,
              total_hours: dayTotalHours,
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
            data: {
              ...old.data,
              employees: withPct,
              labour_daily: labourDaily,
              labour_total: labourTotal,
              labour_cost_pct: labourCostPct,
            },
          };
        }
      );
    },
    onError: () => {
      toast.error('Failed to save work hours');
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
    },
  });

  const { mutate: addEmployee, isPending: isAddingEmployee } = useMutation({
    mutationFn: (name: string) => createEmployee(storeId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getEmployeesQueryKey(storeId) });
      queryClient.invalidateQueries({ queryKey: reportQueryKey });
      setNewEmployeeName('');
    },
    onError: () => {
      toast.error('Failed to add employee');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labour Cost</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <div className="w-full overflow-auto rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {dayLabels.map((label) => (
                  <TableHead key={label} className="text-right">
                    {label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.employees.map((employee) => (
                <TableRow key={employee.employee_id}>
                  <TableCell>{employee.employee_name}</TableCell>
                  {weekDates.map((date) => (
                    <TableCell key={date} className="text-right">
                      <HourInput
                        value={employee.daily_hours[date] || 0}
                        onSave={(hours) =>
                          saveHours({
                            store_id: storeId,
                            employee_id: employee.employee_id,
                            entry_date: date,
                            total_hours: hours,
                          })
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    {employee.total_hours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {employee.percentage_of_all.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={dayLabels.length + 3}>
                  <div className="flex items-center gap-2 py-2">
                    <Input
                      placeholder="New employee name"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newEmployeeName.trim() || isAddingEmployee}
                      onClick={() => addEmployee(newEmployeeName.trim())}
                    >
                      Add Employee
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Total</TableCell>
                {weekDates.map((date) => (
                  <TableCell key={date} className="text-right">
                    {(report.labour_daily[date]?.total_hours ?? 0).toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {report.employees.reduce((a, e) => a + e.total_hours, 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Labour Cost</TableCell>
                {weekDates.map((date) => (
                  <TableCell key={date} className="text-right">
                    {formatCurrency(report.labour_daily[date]?.labour_cost ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right" colSpan={2}>
                  {formatCurrency(report.labour_total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-1 text-sm">
          <div>
            Net Sales (Gross Sales ÷ 1.10):{' '}
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

export default LabourGrid;
