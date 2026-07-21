export type SupplierWeekRow = {
  supplier_id: string;
  supplier_name: string;
  daily_amounts: Record<string, number>;
  total: number;
  percentage_of_all: number;
};

export type LabourDayInfo = {
  staff_count: number;
  total_hours: number;
  labour_cost: number;
  is_weekend: boolean;
};

export type EmployeeWeekRow = {
  employee_id: string;
  employee_name: string;
  daily_hours: Record<string, number>;
  total_hours: number;
  percentage_of_all: number;
};

export type WeeklyReportData = {
  store_id: string;
  week_start_date: string;
  week_end_date: string;
  suppliers: SupplierWeekRow[];
  grand_total_purchase: number;
  gross_sales_daily: Record<string, number>;
  gross_sales_total: number;
  net_sales: number;
  net_sales_rate: number;
  purchase_ratio_pct: number;
  employees: EmployeeWeekRow[];
  weekday_rate: number;
  weekend_rate: number;
  labour_daily: Record<string, LabourDayInfo>;
  labour_total: number;
  labour_cost_pct: number;
};
