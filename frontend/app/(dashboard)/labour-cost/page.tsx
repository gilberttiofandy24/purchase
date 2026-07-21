'use client';

import LabourGrid from '@/app/(dashboard)/labour-cost/_components/LabourGrid';
import LabourOtpGate from '@/app/(dashboard)/labour-cost/_components/LabourOtpGate';
import LabourRateInput from '@/app/(dashboard)/labour-cost/_components/LabourRateInput';
import StoreSelector from '@/app/(dashboard)/purchase-report/_components/StoreSelector';
import WeekNavigator from '@/app/(dashboard)/purchase-report/_components/WeekNavigator';
import { getStores, getStoresQueryKey } from '@/lib/api/store';
import { getWeeklyReport, getWeeklyReportQueryKey } from '@/lib/api/purchase';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useRouter, useSearchParams } from 'next/navigation';

function currentMonday(): string {
  const now = DateTime.now();
  return now.minus({ days: now.weekday - 1 }).toFormat('yyyy-LL-dd');
}

const LabourCostPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: storesData } = useQuery({
    queryKey: getStoresQueryKey(),
    queryFn: getStores,
  });

  const stores = storesData?.data ?? [];
  const storeId = searchParams.get('store_id') || stores[0]?.id || '';
  const weekStartDate = searchParams.get('week') || currentMonday();

  const updateParams = (next: { store_id?: string; week?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.store_id) sp.set('store_id', next.store_id);
    if (next.week) sp.set('week', next.week);
    router.push(`/labour-cost?${sp.toString()}`);
  };

  const { data: reportData } = useQuery({
    queryKey: getWeeklyReportQueryKey({ store_id: storeId, week_start_date: weekStartDate }),
    queryFn: () => getWeeklyReport({ store_id: storeId, week_start_date: weekStartDate }),
    enabled: !!storeId,
  });

  const report = reportData?.data;

  return (
    <LabourOtpGate>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Labour Cost</h1>
            <p className="text-sm text-muted-foreground">
              Weekly staff and work-hour tracking per store.
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
            <LabourRateInput
              storeId={storeId}
              weekStartDate={weekStartDate}
              weekdayRate={report.weekday_rate}
              weekendRate={report.weekend_rate}
            />
            <LabourGrid storeId={storeId} weekStartDate={weekStartDate} report={report} />
          </>
        )}
      </div>
    </LabourOtpGate>
  );
};

export default LabourCostPage;
