const STORAGE_KEY = 'selected-store-id';

export function getStoredStoreId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setStoredStoreId(storeId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, storeId);
}
