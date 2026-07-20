'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';

interface WeekNavigatorProps {
  weekStartDate: string;
  onChange: (weekStartDate: string) => void;
}

const WeekNavigator = ({ weekStartDate, onChange }: WeekNavigatorProps) => {
  const start = DateTime.fromISO(weekStartDate);
  const end = start.plus({ days: 6 });

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(start.minus({ days: 7 }).toFormat('yyyy-LL-dd'))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-44 text-center font-medium">
        {start.toFormat('dd LLL')} - {end.toFormat('dd LLL yyyy')}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(start.plus({ days: 7 }).toFormat('yyyy-LL-dd'))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default WeekNavigator;
