'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store } from '@/schema/store/storeSchema';

interface StoreSelectorProps {
  stores: Store[];
  value: string;
  onChange: (storeId: string) => void;
}

const StoreSelector = ({ stores, value, onChange }: StoreSelectorProps) => {
  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Pilih toko" />
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StoreSelector;
