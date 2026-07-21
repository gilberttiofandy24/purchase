import { api, ResponseData } from '@/lib/api';
import { WeeklyReportData } from '@/schema/purchase/purchaseSchema';

export interface GetWeeklyReportQuery {
  store_id: string;
  week_start_date: string;
}

export const getWeeklyReportQueryKey = (query: GetWeeklyReportQuery) => [
  'purchase-weekly-report',
  query.store_id,
  query.week_start_date,
];

export const getWeeklyReport = async (
  query: GetWeeklyReportQuery
): Promise<ResponseData<WeeklyReportData>> => {
  return await api.get('/purchase/weekly-report', { params: query });
};

export const upsertPurchaseEntry = async (data: {
  store_id: string;
  supplier_id: string;
  purchase_date: string;
  amount: number;
}): Promise<void> => {
  await api.put('/purchase/entry', data);
};

export const upsertGrossSalesEntry = async (data: {
  store_id: string;
  sales_date: string;
  amount: number;
}): Promise<void> => {
  await api.put('/purchase/gross-sales', data);
};

export const upsertNetSales = async (data: {
  store_id: string;
  week_start_date: string;
  amount: number;
}): Promise<void> => {
  await api.put('/purchase/net-sales', data);
};

export const upsertLabourHourEntry = async (data: {
  store_id: string;
  employee_id: string;
  entry_date: string;
  total_hours: number;
}): Promise<void> => {
  await api.put('/labour/hour-entry', data);
};

export const verifyLabourOtp = async (code: string): Promise<void> => {
  await api.post('/labour/verify-otp', { code });
};

export const upsertLabourRate = async (data: {
  store_id: string;
  week_start_date: string;
  weekday_rate: number;
  weekend_rate: number;
}): Promise<void> => {
  await api.put('/labour/rate', data);
};
