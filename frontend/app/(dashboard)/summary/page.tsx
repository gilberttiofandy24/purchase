'use client';

import GrossSalesRow from '@/app/(dashboard)/summary/_components/GrossSalesRow';
import NetSalesRateInput from '@/app/(dashboard)/summary/_components/NetSalesRateInput';
import StoreSelector from '@/app/(dashboard)/purchase-report/_components/StoreSelector';
import WeekNavigator from '@/app/(dashboard)/purchase-report/_components/WeekNavigator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStores, getStoresQueryKey } from '@/lib/api/store';
import { getWeeklyReport, getWeeklyReportQueryKey } from '@/lib/api/purchase';
import { formatCurrency } from '@/lib/formatter';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useRouter, useSearchParams } from 'next/navigation';

function currentMonday(): string {
  const now = DateTime.now();
  return now.minus({ days: now.weekday - 1 }).toFormat('yyyy-LL-dd');
}

const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SummaryPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: storesData } = useQuery({
    queryKey: getStoresQueryKey(),
    queryFn: getStores,
  });

  const stores = storesData?.data ?? [];
  const storeId = searchParams.get('store_id') || stores[0]?.id || '';
  const weekStartDate = searchParams.get('week') || currentMonday();
  const store = stores.find((s) => s.id === storeId);

  const updateParams = (next: { store_id?: string; week?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.store_id) sp.set('store_id', next.store_id);
    if (next.week) sp.set('week', next.week);
    router.push(`/summary?${sp.toString()}`);
  };

  const { data: reportData } = useQuery({
    queryKey: getWeeklyReportQueryKey({ store_id: storeId, week_start_date: weekStartDate }),
    queryFn: () => getWeeklyReport({ store_id: storeId, week_start_date: weekStartDate }),
    enabled: !!storeId,
  });

  const report = reportData?.data;

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(weekStartDate).plus({ days: i }).toFormat('yyyy-LL-dd')
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Summary</h1>
          <p className="text-sm text-muted-foreground">
            {store?.name ?? 'Store'} — {DateTime.fromISO(weekStartDate).toFormat('d LLLL yyyy')} -{' '}
            {DateTime.fromISO(weekStartDate).plus({ days: 6 }).toFormat('d LLLL yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StoreSelector
            stores={stores}
            value={storeId}
            onChange={(id) => updateParams({ store_id: id })}
          />
          <WeekNavigator
            weekStartDate={weekStartDate}
            onChange={(week) => updateParams({ week })}
          />
        </div>
      </div>

      {!storeId && (
        <p className="text-sm text-muted-foreground">
          No stores yet. Add a store first on the Store page.
        </p>
      )}

      {report && storeId && (
        <>
          <div className="w-full overflow-auto rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
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
                  <TableCell className="font-medium">Gross Sales</TableCell>
                  {weekDates.map((date) => (
                    <TableCell key={date} className="text-right">
                      {formatCurrency(report.gross_sales_daily[date] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(report.gross_sales_total)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Net Sales</TableCell>
                  {weekDates.map((date) => (
                    <TableCell key={date} className="text-right">
                      {formatCurrency((report.gross_sales_daily[date] ?? 0) * report.net_sales_rate)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(report.net_sales)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Purchase</TableCell>
                  {weekDates.map((date) => {
                    const total = report.suppliers.reduce(
                      (a, s) => a + (s.daily_amounts[date] ?? 0),
                      0
                    );
                    return (
                      <TableCell key={date} className="text-right">
                        {formatCurrency(total)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(report.grand_total_purchase)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Labour</TableCell>
                  {weekDates.map((date) => (
                    <TableCell key={date} className="text-right">
                      {formatCurrency(report.labour_daily[date]?.labour_cost ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(report.labour_total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <GrossSalesRow storeId={storeId} weekStartDate={weekStartDate} report={report} />

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col divide-y pt-6">
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Gross Sales</span>
                  <span>{formatCurrency(report.gross_sales_total)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Net Sales</span>
                  <span>{formatCurrency(report.net_sales)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Purchase</span>
                  <span>{formatCurrency(report.grand_total_purchase)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Labour (h)</span>
                  <span>
                    {report.employees.reduce((a, e) => a + e.total_hours, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Labour ($)</span>
                  <span>{formatCurrency(report.labour_total)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Purchase ÷ Net Sales</span>
                  <span className="font-semibold">{report.purchase_ratio_pct.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Weekly Labour ÷ Net Sales</span>
                  <span className="font-semibold">{report.labour_cost_pct.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <NetSalesRateInput
              storeId={storeId}
              weekStartDate={weekStartDate}
              rate={report.net_sales_rate}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SummaryPage;
