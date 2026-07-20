'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/formatter';
import { SupplierWeekRow } from '@/schema/purchase/purchaseSchema';
import { Cell, Pie, PieChart } from 'recharts';

interface PurchaseRatioPieChartProps {
  suppliers: SupplierWeekRow[];
}

const COLORS = [
  '#60a5fa',
  '#f87171',
  '#facc15',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#22d3ee',
  '#f472b6',
  '#a3e635',
  '#94a3b8',
];

const PurchaseRatioPieChart = ({ suppliers }: PurchaseRatioPieChartProps) => {
  const data = suppliers
    .filter((s) => s.total > 0)
    .map((s) => ({ name: s.supplier_name, value: s.total }));

  const chartConfig = data.reduce((config, item, index) => {
    config[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
    return config;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Ratio</CardTitle>
        <CardDescription>Persentase pembelian per supplier minggu ini</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data pembelian minggu ini.</p>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-80">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`Rp. ${formatCurrency(Number(value))}`, '']}
                  />
                }
              />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseRatioPieChart;
