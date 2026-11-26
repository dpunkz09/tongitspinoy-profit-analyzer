'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { agentRowsOf, buildSummary, toPercent } from '../_lib/calc';
import { COLUMNS } from '../_lib/config';
import { exportCsv, toCsv } from '../_lib/export';
import { formatCount, formatNumber, signTone } from '../_lib/format';
import type { Column, ColumnKey, Layout, SheetData, SortState } from '../_lib/types';
import { AgentCards } from './AgentCards';
import { AgentTable } from './AgentTable';
import { Icon } from './Icon';
import { BUTTON, ColumnMenu, Kpi, LayoutToggle, Methodology } from './ui';

/** Cards are added in batches so long agent lists stay quick on phones. */
const CARD_BATCH = 30;

const collator = new Intl.Collator(undefined, { numeric: true });

const defaultDirection = (col: Column) => (col.align === 'right' ? 'desc' : 'asc');

export function GameView({
  sheet,
  percentText,
  onPercentChange,
  onApplyToAll,
  gameCount,
  visibleColumns,
  onToggleColumn,
  isPhone,
  mobileLayout,
  onLayoutChange,
  zoom,
  onZoomChange,
}: {
  sheet: SheetData;
  percentText: string;
  onPercentChange: (text: string) => void;
  onApplyToAll: (text: string) => void;
  gameCount: number;
  visibleColumns: ReadonlySet<ColumnKey>;
  onToggleColumn: (key: ColumnKey) => void;
  isPhone: boolean;
  mobileLayout: Layout;
  onLayoutChange: (layout: Layout) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [batch, setBatch] = useState({ key: '', limit: CARD_BATCH });

  // Typing stays responsive while a long list filters in the background.
  const deferredQuery = useDeferredValue(query);

  const { row: totals } = useMemo(() => buildSummary(sheet), [sheet]);
  const agentRows = useMemo(() => agentRowsOf(sheet), [sheet]);

  const visibleRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const rows = q
      ? agentRows.filter((r) => r.agentId.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q))
      : agentRows;

    if (!sort) return rows;

    const { key, dir } = sort;
    const sign = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      return (
        sign *
        (typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : collator.compare(String(av), String(bv)))
      );
    });
  }, [agentRows, deferredQuery, sort]);

  const toggleSort = (col: Column) =>
    setSort((prev) => {
      const first = defaultDirection(col);
      if (!prev || prev.key !== col.key) return { key: col.key, dir: first };
      if (prev.dir === first) return { key: col.key, dir: first === 'asc' ? 'desc' : 'asc' };
      return null;
    });

  const toggleHighlight = (rowId: string) => setHighlighted((prev) => (prev === rowId ? null : rowId));

  const showCards = isPhone && mobileLayout === 'cards';
  const shownColumns = COLUMNS.filter((col) => col.key === 'agent' || visibleColumns.has(col.key));

  // A new search or sort starts again from the first batch.
  const batchKey = `${deferredQuery}|${sort?.key}|${sort?.dir}`;
  const cardLimit = batch.key === batchKey ? batch.limit : CARD_BATCH;
  const remaining = visibleRows.length - cardLimit;

  const percent = toPercent(percentText);
  const percentOutOfRange = percent < 0 || percent > 100;
  const emptyText = `No agents match “${query}”.`;

  const handleExport = () =>
    void exportCsv(
      sheet.sheetName,
      toCsv(
        COLUMNS.map((c) => c.label),
        [...visibleRows, totals].map((row) => COLUMNS.map((c) => row[c.key]))
      )
    );

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
      {/* On phones the three profit results move to the top. */}
      <section
        aria-label={`${sheet.sheetName} totals`}
        className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        <Kpi label="Players" value={formatCount(totals.players)} />
        <Kpi label="Hands" value={formatCount(totals.hands)} />
        {money('Bet amount', totals.betAmount)}
        {money('Winnings', totals.winnings)}
        {money('Diamond consume', totals.diamondConsume, {
          hint: 'Calculated',
          className: 'max-md:col-span-2',
        })}
        {money('Accurate profit', totals.accurateProfit, {
          signed: true,
          hint: 'Calculated',
          className: 'max-md:-order-2',
        })}
        {money('Real profit', totals.realProfit, {
          signed: true,
          hint: 'Calculated',
          className: 'max-md:-order-2',
        })}
        {money(`Real profit ${percent}%`, totals.realProfitPercent, {
          signed: true,
          hint: 'Based on percentage',
          className: 'max-md:-order-1 max-md:col-span-2',
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Agent breakdown</h2>
            <p className="mt-0.5 text-sm text-slate-500" aria-live="polite">
              Showing {visibleRows.length} of {agentRows.length} agents
            </p>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="flex items-center gap-2">
              <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 md:min-h-9 xl:flex-none">
                <span className="whitespace-nowrap text-xs font-medium text-slate-600">Profit %</span>
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="done"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentText}
                  onChange={(e) => onPercentChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-right text-sm font-semibold text-slate-900 focus:outline-none xl:w-20"
                />
                <span className="text-xs text-slate-500">%</span>
              </label>
              {gameCount > 1 && (
                <button
                  type="button"
                  onClick={() => onApplyToAll(percentText)}
                  disabled={percentText === ''}
                  className={`${BUTTON} whitespace-nowrap disabled:opacity-50`}
                >
                  Apply to all games
                </button>
              )}
            </div>

            <div className="relative xl:ml-auto xl:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agent or ID"
                aria-label="Search agents"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 md:min-h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <LayoutToggle value={mobileLayout} onChange={onLayoutChange} />
              {!showCards && (
                <ColumnMenu
                  columns={COLUMNS}
                  visible={visibleColumns}
                  onToggle={onToggleColumn}
                  requiredKey="agent"
                />
              )}
              <button type="button" onClick={handleExport} className={BUTTON}>
                <Icon name="download" className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {showCards && (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Sort agents by"
                  value={sort?.key ?? ''}
                  onChange={(e) => {
                    const col = COLUMNS.find((c) => c.key === e.target.value);
                    setSort(col ? { key: col.key, dir: defaultDirection(col) } : null);
                  }}
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                >
                  <option value="">Sort: file order</option>
                  {COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      Sort: {col.label}
                    </option>
                  ))}
                </select>
                {sort && (
                  <button
                    type="button"
                    onClick={() => setSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
                    className={BUTTON}
                  >
                    <Icon name={sort.dir === 'asc' ? 'sort-asc' : 'sort-desc'} className="h-4 w-4" />
                    {sort.dir === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                )}
              </div>
            )}
          </div>

          {percentOutOfRange && (
            <p className="text-xs font-medium text-amber-700">
              Profit % is outside 0–100. Check that this is what you meant.
            </p>
          )}
        </div>

        {showCards ? (
          <div className="bg-slate-50 p-2">
            {visibleRows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">{emptyText}</p>
            ) : (
              <AgentCards
                rows={visibleRows.slice(0, cardLimit)}
                openId={highlighted}
                onToggle={toggleHighlight}
              />
            )}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setBatch({ key: batchKey, limit: cardLimit + CARD_BATCH })}
                className={`${BUTTON} mt-2 w-full`}
              >
                Show {Math.min(CARD_BATCH, remaining)} more ({remaining} left)
              </button>
            )}
          </div>
        ) : (
          <AgentTable
            columns={shownColumns}
            rows={visibleRows}
            totals={totals}
            sort={sort}
            onSort={toggleSort}
            highlighted={highlighted}
            onHighlight={toggleHighlight}
            emptyText={emptyText}
            zoom={zoom}
            onZoomChange={onZoomChange}
          />
        )}

        <div className="rounded-b-lg border-t border-slate-200 px-4 py-1 sm:px-5">
          <Methodology />
        </div>
      </section>
    </div>
  );
}
