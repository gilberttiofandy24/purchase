'use client';

import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface LabourDayCellProps {
  staffCount: number;
  totalHours: number;
  onSave: (staffCount: number, totalHours: number) => void;
}

const LabourDayCell = ({ staffCount, totalHours, onSave }: LabourDayCellProps) => {
  const [staff, setStaff] = useState(staffCount);
  const [hours, setHours] = useState(totalHours);

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        type="number"
        min={0}
        value={staff || ''}
        onChange={(e) => setStaff(Number(e.target.value) || 0)}
        onBlur={() => onSave(staff, hours)}
        placeholder="Staff"
        className="w-20 text-right"
      />
      <Input
        type="number"
        min={0}
        step="0.25"
        value={hours || ''}
        onChange={(e) => setHours(Number(e.target.value) || 0)}
        onBlur={() => onSave(staff, hours)}
        placeholder="Jam"
        className="w-20 text-right"
      />
    </div>
  );
};

export default LabourDayCell;
