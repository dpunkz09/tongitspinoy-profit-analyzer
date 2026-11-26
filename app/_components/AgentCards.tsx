'use client';

import { COLUMNS } from '../_lib/config';
import { renderValue, signTone } from '../_lib/format';
import type { ColumnKey, GameData } from '../_lib/types';

const column = (key: ColumnKey) => COLUMNS.find((c) => c.key === key)!;

const HEADLINE: ColumnKey[] = ['accurateProfit', 'realProfit', 'realProfitPercent'];
const SECONDARY: ColumnKey[] = ['betAmount', 'winnings', 'diamondConsume'];
const DETAILS: ColumnKey[] = [
  'players',
  'hands',
  'diamondCost',
  'roomQuotaDiamondCost',
  'clubProfit',
  'totalBetAmountPercent',
];

function Field({ row, name, label }: { row: GameData; name: ColumnKey; label?: string }) {
  const col = column(name);
  const value = row[name];
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500">{label ?? col.label}</span>
      <span
        className={`text-right text-sm tabular-nums [overflow-wrap:anywhere] ${
          col.signed && typeof value === 'number' ? `font-semibold ${signTone(value)}` : 'font-medium text-slate-800'
        }`}
      >
        {renderValue(row, col)}
      </span>
    </span>
  );
}

export function AgentCards({
  rows,
  openId,
  onToggle,
}: {
  rows: GameData[];
  openId: string | null;
  onToggle: (rowId: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const open = openId === row.rowId;
        return (
          // content-visibility lets the phone skip drawing cards that are off screen.
          <li key={row.rowId} className="[contain-intrinsic-size:auto_220px] [content-visibility:auto]">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggle(row.rowId)}
              className={`block w-full rounded-lg border p-3 text-left shadow-sm ${
                open ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900 [overflow-wrap:anywhere]">
                    {row.agent || '—'}
                  </span>
                  <span className="block font-mono text-xs text-slate-500">ID {row.agentId || '—'}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-blue-700">{open ? 'Less ▲' : 'More ▼'}</span>
              </span>

              <span className="mt-2 block space-y-1">
                {HEADLINE.map((key) => (
                  <Field
                    key={key}
                    row={row}
                    name={key}
                    label={key === 'realProfitPercent' ? 'Real Profit % (collab)' : undefined}
                  />
                ))}
              </span>

              <span className="mt-2 block space-y-1 border-t border-slate-200 pt-2">
                {[...SECONDARY, ...(open ? DETAILS : [])].map((key) => (
                  <Field key={key} row={row} name={key} />
                ))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
