'use client';

import GrossSalesRow from '@/app/(dashboard)/purchase-report/_components/GrossSalesRow';
import LabourCostRow from '@/app/(dashboard)/purchase-report/_components/LabourCostRow';
import NetSalesInput from '@/app/(dashboard)/purchase-report/_components/NetSalesInput';
import PurchaseGrid from '@/app/(dashboard)/purchase-report/_components/PurchaseGrid';
import PurchaseRatioPieChart from '@/app/(dashboard)/purchase-report/_components/PurchaseRatioPieChart';
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

const PurchaseReportPage = () => {
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
    router.push(`/purchase-report?${sp.toString()}`);
  };

  const { data: reportData } = useQuery({
    queryKey: getWeeklyReportQueryKey({ store_id: storeId, week_start_date: weekStartDate }),
    queryFn: () => getWeeklyReport({ store_id: storeId, week_start_date: weekStartDate }),
    enabled: !!storeId,
  });

  const report = reportData?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Purchase Report</h1>
          <p className="text-sm text-muted-foreground">
            Tracking pembelian mingguan per supplier per toko.
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
          Belum ada toko. Tambahkan toko terlebih dahulu di halaman Toko.
        </p>
      )}

      {report && storeId && (
        <>
          <PurchaseGrid storeId={storeId} weekStartDate={weekStartDate} report={report} />

          <LabourCostRow storeId={storeId} weekStartDate={weekStartDate} report={report} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <GrossSalesRow storeId={storeId} weekStartDate={weekStartDate} report={report} />
              <NetSalesInput
                storeId={storeId}
                weekStartDate={weekStartDate}
                netSales={report.net_sales}
                purchaseRatioPct={report.purchase_ratio_pct}
              />
            </div>
            <PurchaseRatioPieChart suppliers={report.suppliers} />
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseReportPage;
