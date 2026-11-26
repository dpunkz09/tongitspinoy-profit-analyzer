import type { Column, GameData } from './types';

const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const countFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// "+ 0" turns -0 into 0 so zero never renders as "-0.00".
export const formatNumber = (n: number) => numberFormat.format(n + 0);
export const formatCount = (n: number) =>
  Number.isInteger(n) ? countFormat.format(n) : formatNumber(n);

export const signTone = (n: number) =>
  n < 0 ? 'text-rose-700' : n > 0 ? 'text-emerald-700' : 'text-slate-500';

export function renderValue(row: GameData, col: Column): string {
  const value = row[col.key];
  if (typeof value === 'string') return value || '—';

  switch (col.kind) {
    case 'percent':
      return `${value.toFixed(4)}%`;
    case 'count':
      return formatCount(value);
    default:
      return formatNumber(value);
  }
}
