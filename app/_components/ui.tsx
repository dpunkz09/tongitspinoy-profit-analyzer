'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { DIAMOND_DIVISOR } from '../_lib/config';
import type { Layout, Notice } from '../_lib/types';
import { Icon } from './Icon';

export const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 md:min-h-9';

export function Kpi({
  label,
  value,
  valueClass = 'text-slate-900',
  hint,
  className = '',
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
  className?: string;
}) {
  // Money is never truncated: long figures get a smaller size instead.
  const size =
    value.length > 15
      ? 'text-sm sm:text-base'
      : value.length > 12
        ? 'text-base sm:text-lg'
        : 'text-lg sm:text-xl';

  return (
    <div className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums [overflow-wrap:anywhere] sm:mt-2 ${size} ${valueClass}`}>
        {value}
      </p>
      {hint && <p className="mt-1 hidden text-xs text-slate-500 sm:block">{hint}</p>}
    </div>
  );
}

export function Banner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const styles =
    notice.tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <div role="alert" className={`mb-4 flex items-start gap-3 rounded-lg border p-3 sm:mb-6 sm:p-4 ${styles}`}>
      <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 opacity-90 [overflow-wrap:anywhere]">{notice.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded opacity-70 hover:opacity-100"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BrandMark() {
  return (
    <Image
      src="/logo.png"
      alt="TongitsPinoy Logo"
      width={36}
      height={36}
      priority
      className="h-9 w-9 shrink-0 rounded-md object-contain"
    />
  );
}

/** Cards / Table switch, shown on phones only. */
export function LayoutToggle({ value, onChange }: { value: Layout; onChange: (layout: Layout) => void }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-md bg-slate-100 p-1 md:hidden">
      {(['cards', 'table'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-medium capitalize ${
            value === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Icon name={option} className="h-4 w-4" />
          {option}
        </button>
      ))}
    </div>
  );
}

/** "Columns" button + checklist. A bottom sheet on phones, a dropdown on larger screens. */
export function ColumnMenu<K extends string>({
  columns,
  visible,
  onToggle,
  requiredKey,
}: {
  columns: ReadonlyArray<{ key: K; label: string; calculated?: boolean }>;
  visible: ReadonlySet<K>;
  onToggle: (key: K) => void;
  /** Primary identifier column; it is shown checked and can't be hidden. */
  requiredKey: K;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // pointerdown also fires for touch; iOS doesn't reliably send mousedown.
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={BUTTON}
        aria-expanded={open}
      >
        <Icon name="columns" className="h-4 w-4" />
        Columns
      </button>

      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-lg sm:pb-0">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Show/Hide Columns
              </p>
            </div>
            <div className="max-h-[55dvh] overflow-y-auto overscroll-contain p-2 sm:max-h-96">
              {columns.map((col) => {
                const isRequired = col.key === requiredKey;
                return (
                  <label
                    key={col.key}
                    className={`flex min-h-11 items-center gap-3 rounded px-3 text-sm sm:min-h-9 ${
                      isRequired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isRequired || visible.has(col.key)}
                      onChange={() => onToggle(col.key)}
                      disabled={isRequired}
                      className="h-5 w-5 accent-blue-700 sm:h-4 sm:w-4"
                    />
                    <span className="flex-1 text-slate-700">
                      {col.label}
                      {col.calculated && <span className="ml-1 text-xs text-blue-600">(calc)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="border-t border-slate-200 p-3">
              <button type="button" onClick={() => setOpen(false)} className={`${BUTTON} w-full`}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const FORMULAS = [
  ['Diamond Consume', `Room Quota Diamond Cost ÷ ${DIAMOND_DIVISOR}`],
  ['Accurate Profit', '−Winnings − Diamond Consume'],
  ['Real Profit', 'Accurate Profit − Diamond Consume'],
  ['Real Profit %', '(All Agent Real Profit × Percentage) × Agent Total Bet %'],
];

export function Methodology() {
  return (
    <details className="text-xs text-slate-500">
      <summary className="cursor-pointer select-none py-2 font-medium text-slate-600">
        How these are calculated
      </summary>
      <dl className="space-y-1 pb-1">
        {FORMULAS.map(([name, formula]) => (
          <div key={name}>
            <dt className="inline font-medium text-slate-600">{name}</dt>
            <dd className="inline"> = {formula}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
