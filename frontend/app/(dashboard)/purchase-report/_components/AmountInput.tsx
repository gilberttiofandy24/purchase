'use client';

import { Input } from '@/components/ui/input';

interface AmountInputProps {
  value: number;
  onSave: (amount: number) => void;
  disabled?: boolean;
}

const AmountInput = ({ value, onSave, disabled }: AmountInputProps) => {
  return (
    <Input
      key={value}
      type="number"
      min={0}
      step="0.01"
      defaultValue={value || ''}
      disabled={disabled}
      className="w-28 text-right"
      onBlur={(e) => {
        const amount = Number(e.target.value) || 0;
        if (amount !== value) {
          onSave(amount);
        }
      }}
    />
  );
};

export default AmountInput;
