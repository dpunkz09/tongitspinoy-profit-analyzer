'use client';

import { useMemo } from 'react';
import { buildSummary } from '../_lib/calc';
import { OVERVIEW_COLUMNS, TARGET_SHEETS } from '../_lib/config';
import { exportCsv, toCsv } from '../_lib/export';
import { formatCount, formatNumber, signTone } from '../_lib/format';
import type { Layout, OverviewColumn, OverviewKey, SheetData, SheetTotals } from '../_lib/types';
import { Icon } from './Icon';
import { BUTTON, ColumnMenu, Kpi, LayoutToggle, Methodology } from './ui';
import { ZoomableTable } from './ZoomableTable';

type OverviewRow = SheetTotals & { sheet: SheetData };

/** The value behind each column; `null` means "no total for this column". */
function cellValue(key: OverviewKey, { sheet, row, agents }: OverviewRow): string | number {
  switch (key) {
    case 'game':
      return sheet.sheetName;
    case 'period':
      return sheet.dateRange;
    case 'agents':
      return agents;
    default:
      return row[key];
  }
}

const COUNT_KEYS: ReadonlySet<OverviewKey> = new Set(['agents', 'players']);
const SIGNED_KEYS: ReadonlySet<OverviewKey> = new Set(['accurateProfit', 'realProfit', 'realProfitPercent']);
const TOTAL_KEYS = [
  'betAmount',
  'winnings',
  'diamondConsume',
  'accurateProfit',
  'realProfit',
  'realProfitPercent',
] as const;

type Totals = Record<(typeof TOTAL_KEYS)[number], number>;

const isTotalKey = (key: OverviewKey): key is keyof Totals =>
  (TOTAL_KEYS as readonly OverviewKey[]).includes(key);

const display = (key: OverviewKey, value: string | number) =>
  typeof value === 'string' ? value || '—' : COUNT_KEYS.has(key) ? formatCount(value) : formatNumber(value);

function Metric({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`text-sm font-semibold tabular-nums [overflow-wrap:anywhere] ${
          signed ? signTone(value) : 'text-slate-900'
        }`}
      >
        {formatNumber(value)}
      </dd>
    </div>
  );
}

function GameCard({ entry, onOpen }: { entry: OverviewRow; onOpen: (name: string) => void }) {
  const { sheet, row, agents, computed } = entry;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(sheet.sheetName)}
        className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-blue-700">{sheet.sheetName} ›</span>
          <span className="shrink-0 text-xs text-slate-500">
            {formatCount(agents)} {agents === 1 ? 'agent' : 'agents'}
            {computed && ' · computed'}
          </span>
        </span>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
          <Metric label="Accurate profit" value={row.accurateProfit} signed />
          <Metric label="Real profit" value={row.realProfit} signed />
          <Metric label="Real profit %" value={row.realProfitPercent} signed />
          <Metric label="Diamond consume" value={row.diamondConsume} />
          <Metric label="Bet amount" value={row.betAmount} />
          <Metric label="Winnings" value={row.winnings} />
        </dl>
      </button>
    </li>
  );
}

export function OverviewView({
  sheets,
  onOpen,
  visibleColumns,
  onToggleColumn,
  isPhone,
  mobileLayout,
  onLayoutChange,
  zoom,
  onZoomChange,
}: {
  sheets: SheetData[];
  onOpen: (sheetName: string) => void;
  visibleColumns: ReadonlySet<OverviewKey>;
  onToggleColumn: (key: OverviewKey) => void;
  isPhone: boolean;
  mobileLayout: Layout;
  onLayoutChange: (layout: Layout) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const rows = useMemo<OverviewRow[]>(
    () => sheets.map((sheet) => ({ sheet, ...buildSummary(sheet) })),
    [sheets]
  );

  const grand = useMemo(() => {
    const totals = Object.fromEntries(TOTAL_KEYS.map((key) => [key, 0])) as Totals;
    for (const { row } of rows) {
      for (const key of TOTAL_KEYS) totals[key] += row[key];
    }
    return totals;
  }, [rows]);

  const showCards = isPhone && mobileLayout === 'cards';
  const shownColumns = OVERVIEW_COLUMNS.filter((col) => col.key === 'game' || visibleColumns.has(col.key));

  const handleExport = () =>
    void exportCsv(
      'Game_summary',
      toCsv(
        OVERVIEW_COLUMNS.map((c) => c.label),
        [
          ...rows.map((entry) => OVERVIEW_COLUMNS.map((c) => cellValue(c.key, entry))),
          OVERVIEW_COLUMNS.map((c) =>
            c.key === 'game' ? 'All games' : isTotalKey(c.key) ? grand[c.key] : ''
          ),
        ]
      )
    );

  const headBase =
    'border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap';

  const renderCell = (col: OverviewColumn, entry: OverviewRow) => {
    const value = cellValue(col.key, entry);
    const tone =
      SIGNED_KEYS.has(col.key) && typeof value === 'number'
        ? `font-semibold ${signTone(value)}`
        : col.calculated
          ? 'font-medium text-slate-900'
          : 'text-slate-700';

    return (
      <td
        key={col.key}
        title={col.key === 'period' ? entry.sheet.dateRange : undefined}
        className={`border-b border-slate-100 px-4 py-3 tabular-nums whitespace-nowrap ${
          col.align === 'right' ? 'text-right' : 'text-left'
        } ${col.calculated ? 'bg-blue-50/40' : ''} ${col.key === 'period' ? 'max-w-[260px] truncate' : ''} ${tone}`}
      >
        {col.key === 'game' ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(entry.sheet.sheetName);
              }}
              className="text-left font-medium text-blue-700 hover:underline"
            >
              {entry.sheet.sheetName}
            </button>
            {entry.computed && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                computed
              </span>
            )}
          </>
        ) : (
          display(col.key, value)
        )}
      </td>
    );
  };

  const money = (label: string, value: number, extra: { signed?: boolean; hint?: string; className?: string } = {}) => (
    <Kpi
      label={label}
      value={formatNumber(value)}
      valueClass={extra.signed ? signTone(value) : undefined}
      hint={extra.hint}
      className={extra.className}
    />
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <section
        aria-label="Totals across all games"
        className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-7"
      >
        <Kpi label="Games loaded" value={String(rows.length)} hint={`of ${TARGET_SHEETS.length} expected`} />
        {money('Total bet amount', grand.betAmount)}
        {money('Total winnings', grand.winnings)}
        {money('Diamond consume', grand.diamondConsume, { hint: 'Calculated' })}
        {money('Accurate profit', grand.accurateProfit, {
          signed: true,
          hint: 'Calculated',
          className: 'max-sm:-order-2',
        })}
        {money('Real profit', grand.realProfit, {
          signed: true,
          hint: 'Calculated',
          className: 'max-sm:-order-2',
        })}
        {/* The three profit results lead on phones. */}
        {money('Real profit %', grand.realProfitPercent, {
          signed: true,
          hint: 'Based on percentages',
          className: 'max-sm:-order-1 max-sm:col-span-2',
        })}
      </section>

      {/* No overflow-hidden here: it would clip the Columns dropdown. */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Game summary</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Figures come from each sheet’s All Players row. Select a game to see its agents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LayoutToggle value={mobileLayout} onChange={onLayoutChange} />
            {!showCards && (
              <ColumnMenu
                columns={OVERVIEW_COLUMNS}
                visible={visibleColumns}
                onToggle={onToggleColumn}
                requiredKey="game"
              />
            )}
            <button type="button" onClick={handleExport} className={BUTTON}>
              <Icon name="download" className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {showCards ? (
          <ul className="space-y-2 bg-slate-50 p-2">
            {rows.map((entry) => (
              <GameCard key={entry.sheet.sheetName} entry={entry} onOpen={onOpen} />
            ))}
          </ul>
        ) : (
          <ZoomableTable
            zoom={zoom}
            onZoomChange={onZoomChange}
            className="isolate overflow-x-auto overscroll-x-contain"
          >
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {shownColumns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`${headBase} ${
                        col.calculated ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-600'
                      } ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr
                    key={entry.sheet.sheetName}
                    onClick={() => onOpen(entry.sheet.sheetName)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    {shownColumns.map((col) => renderCell(col, entry))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold text-slate-900">
                  {shownColumns.map((col) => {
                    const key = col.key;
                    return (
                      <td
                        key={key}
                        className={`whitespace-nowrap border-t-2 border-slate-300 px-4 py-3 tabular-nums ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${isTotalKey(key) && SIGNED_KEYS.has(key) ? signTone(grand[key]) : ''}`}
                      >
                        {key === 'game' ? 'All games' : isTotalKey(key) ? formatNumber(grand[key]) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </ZoomableTable>
        )}

        <div className="border-t border-slate-200 px-4 py-1 sm:px-5">
          <Methodology />
        </div>
      </section>
    </div>
  );
}
