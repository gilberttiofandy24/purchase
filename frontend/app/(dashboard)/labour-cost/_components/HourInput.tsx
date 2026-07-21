'use client';

import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';

const NUMBER_PROPS = {
  displayType: 'input',
  customInput: Input,
  allowNegative: false,
  decimalScale: 2,
} satisfies NumericFormatProps;

interface HourInputProps {
  value: number;
  onSave: (hours: number) => void;
  disabled?: boolean;
}

const HourInput = ({ value, onSave, disabled }: HourInputProps) => {
  const [hours, setHours] = useState(value);

  return (
    <NumericFormat
      key={value}
      value={hours || ''}
      onValueChange={(values) => setHours(Number(values.value))}
      onBlur={() => {
        if (hours !== value) onSave(hours);
      }}
      maxLength={6}
      disabled={disabled}
      placeholder="Hrs"
      className="w-20 text-right"
      {...NUMBER_PROPS}
    />
  );
};

export default HourInput;
