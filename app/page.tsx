'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface GameData {
  agentId: string;
  agent: string;
  players: number;
  winnings: number;
  diamondCost: number;
  hands: number;
  betAmount: number;
  totalBetAmountPercent: number;
  roomQuotaDiamondCost: number;
  clubProfit: number;
  diamondConsume: number;
  accurateProfit: number;
  realProfit: number;
  realProfitPercent: number;
}

interface SheetData {
  sheetName: string;
  dateRange: string;
  data: GameData[];
  percentageInput: number;
}

interface SheetTotals {
  row: GameData;
  computed: boolean;
  agents: number;
}

interface Notice {
  tone: 'error' | 'warning';
  title: string;
  message: string;
}

type SortState = { key: keyof GameData; dir: 'asc' | 'desc' } | null;

interface Column {
  key: keyof GameData;
  label: string;
  align: 'left' | 'right';
  kind: 'text' | 'count' | 'number' | 'percent';
  calculated?: boolean;
  signed?: boolean;
  hint?: string;
  minWidth?: string;
}

/* -------------------------------------------------------------------------- */
/*  Configuration                                                              */
/* -------------------------------------------------------------------------- */

const APP_NAME = 'TongitsPinoy Profit Analyzer';
const DEVELOPER = 'developed by jpaworx';
const OVERVIEW = '__overview__';

// Room Quota Diamond Cost is divided by this to get Diamond Consume.
const DIAMOND_DIVISOR = 44;

// Flip to true to dump raw worksheet diagnostics to the browser console.
const DEBUG = false;

const TARGET_SHEETS = [
  'Color Game',
  'Color Game Plus',
  'Mines',
  'Mines2.0',
  'Plinko Game',
  'Perya Drop Ball',
  'BingoGame',
  'Sakla',
  'Slot',
  'Mega Fishing 3D',
  'Candy Spin',
];

const HEADER_ALIASES: Record<string, string[]> = {
  agentId: ['agentid'],
  agent: ['agent'],
  players: ['players', 'player'],
  winnings: ['winnings', 'winning'],
  diamondCost: ['diamondcost'],
  hands: ['hands', 'hand'],
  betAmount: ['betamount'],
  totalBetAmountPercent: ['totalbetamount', 'totalbetamountpercent', 'totalbet'],
  roomQuotaDiamondCost: ['roomquotadiamondcost', 'roomquota'],
  clubProfit: ['clubprofit'],
};

// Columns shown by default on phones; everything else is one tap away in the Columns menu.
const MOBILE_DEFAULT_COLUMNS: ReadonlyArray<keyof GameData> = [
  'agent',
  'agentId',
  'winnings',
  'betAmount',
  'diamondConsume',
  'accurateProfit',
  'realProfit',
  'realProfitPercent',
];

const COLUMNS: Column[] = [
  { key: 'agent', label: 'Agent', align: 'left', kind: 'text', minWidth: 'min-w-[170px]' },
  { key: 'agentId', label: 'Agent ID', align: 'left', kind: 'text', minWidth: 'min-w-[96px] sm:min-w-[110px]' },
  { key: 'players', label: 'Players', align: 'right', kind: 'count', minWidth: 'min-w-[100px]' },
  { key: 'winnings', label: 'Winnings', align: 'right', kind: 'number', minWidth: 'min-w-[130px]' },
  { key: 'diamondCost', label: 'Diamond Cost', align: 'right', kind: 'number', minWidth: 'min-w-[140px]' },
  { key: 'hands', label: 'Hands', align: 'right', kind: 'count', minWidth: 'min-w-[100px]' },
  { key: 'betAmount', label: 'Bet Amount', align: 'right', kind: 'number', minWidth: 'min-w-[140px]' },
  { key: 'totalBetAmountPercent', label: 'Total Bet %', align: 'right', kind: 'percent', minWidth: 'min-w-[120px]' },
  { key: 'roomQuotaDiamondCost', label: 'Room Quota Diamond', align: 'right', kind: 'number', minWidth: 'min-w-[170px]' },
  { key: 'clubProfit', label: 'Club Profit', align: 'right', kind: 'number', minWidth: 'min-w-[130px]' },
  {
    key: 'diamondConsume',
    label: 'Diamond Consume',
    align: 'right',
    kind: 'number',
    calculated: true,
    hint: `Room Quota Diamond ÷ ${DIAMOND_DIVISOR}`,
    minWidth: 'min-w-[160px]',
  },
  {
    key: 'accurateProfit',
    label: 'Accurate Profit',
    align: 'right',
    kind: 'number',
    calculated: true,
    signed: true,
    hint: '−Winnings − Diamond Consume',
    minWidth: 'min-w-[160px]',
  },
  {
    key: 'realProfit',
    label: 'Real Profit',
    align: 'right',
    kind: 'number',
    calculated: true,
    signed: true,
    hint: 'Accurate Profit − Diamond Consume',
    minWidth: 'min-w-[160px]',
  },
  {
    key: 'realProfitPercent',
    label: 'Real Profit %',
    align: 'right',
    kind: 'number',
    calculated: true,
    signed: true,
    hint: 'Real Profit × Percentage',
    minWidth: 'min-w-[160px]',
  },
];

/* -------------------------------------------------------------------------- */
/*  Parsing                                                                    */
/* -------------------------------------------------------------------------- */

const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseValue = (value: unknown): number => {
  if (value === '/' || value === undefined || value === null || value === '') {
    return 0;
  }

  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isSummaryRow = (row: GameData): boolean =>
  row.agent.toLowerCase().replace(/\s+/g, '') === 'allplayers';

function parseWorksheet(
  sheetName: string,
  worksheet: XLSX.WorkSheet | undefined
): SheetData | null {
  if (!worksheet || !worksheet['!ref']) {
    console.warn(`Sheet "${sheetName}" is empty.`);
    return null;
  }

  const cellAddresses = Object.keys(worksheet).filter((key) =>
    /^[A-Z]+[0-9]+$/.test(key)
  );

  if (cellAddresses.length === 0) {
    console.warn(`Sheet "${sheetName}" has no cells.`);
    return null;
  }

  if (DEBUG) {
    console.group(`EXCEL DEBUG: ${sheetName}`);
    console.log('Worksheet reference:', worksheet['!ref']);
    console.log('Merged cells:', worksheet['!merges']);
    console.table(
      cellAddresses.map((address) => ({
        address,
        value: worksheet[address]?.v,
        formatted: worksheet[address]?.w,
        type: worksheet[address]?.t,
        formula: worksheet[address]?.f,
      }))
    );
    console.log(
      'Raw worksheet rows:',
      XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: true,
      })
    );
    console.groupEnd();
  }

  // Rebuild the real range from the cells that exist, because the sheet's own
  // !ref value can be wrong.
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;

  for (const address of cellAddresses) {
    const cell = XLSX.utils.decode_cell(address);
    if (cell.r < minR) minR = cell.r;
    if (cell.c < minC) minC = cell.c;
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }

  const range = { s: { r: minR, c: minC }, e: { r: maxR, c: maxC } };

  if (DEBUG) {
    console.log(
      `Corrected range for "${sheetName}":`,
      XLSX.utils.encode_range(range)
    );
  }

  const getCell = (row: number, col: number): unknown => {
    const address = XLSX.utils.encode_cell({ r: row, c: col });
    return worksheet[address]?.v ?? '';
  };

  // Find the actual header row and column positions.
  let headerRow = -1;
  let columnMap: Record<string, number> = {};

  for (let r = range.s.r; r <= range.e.r; r++) {
    const currentMap: Record<string, number> = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const header = normalizeHeader(getCell(r, c));

      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(header)) {
          currentMap[field] = c;
        }
      }
    }

    if (currentMap.agentId !== undefined && currentMap.agent !== undefined) {
      headerRow = r;
      columnMap = currentMap;
      break;
    }
  }

  if (headerRow === -1) {
    console.warn(`Sheet "${sheetName}": Agent ID header not found.`);
    return null;
  }

  if (DEBUG) {
    console.log(`Sheet "${sheetName}" header row:`, headerRow + 1);
    console.log(`Sheet "${sheetName}" column map:`, columnMap);
  }

  // The date range is the first non-empty cell above the header row.
  let dateRange = '';

  for (let r = range.s.r; r < headerRow && !dateRange; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const value = getCell(r, c);

      if (value !== '') {
        dateRange = String(value);
        break;
      }
    }
  }

  const readField = (row: number, field: string): unknown => {
    const col = columnMap[field];
    return col === undefined ? '' : getCell(row, col);
  };

  const gameData: GameData[] = [];

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const agentId = String(readField(r, 'agentId') ?? '').trim();
    const agentName = String(readField(r, 'agent') ?? '').trim();

    // Keep the "All Players" summary row, skip anything without a numeric ID.
    const summary =
      agentName.toLowerCase().replace(/\s+/g, '') === 'allplayers';

    if (!summary && (agentId === '' || agentId === '/' || !/^\d+$/.test(agentId))) {
      continue;
    }

    const roomQuotaDiamondCost = parseValue(readField(r, 'roomQuotaDiamondCost'));
    const clubProfit = parseValue(readField(r, 'clubProfit'));
    const winnings = parseValue(readField(r, 'winnings'));

    const diamondConsume = roomQuotaDiamondCost / DIAMOND_DIVISOR;
    const accurateProfit = -winnings - diamondConsume;
    const realProfit = accurateProfit - diamondConsume;
    const realProfitPercent = 0; // Will be calculated dynamically based on user input

    gameData.push({
      agentId,
      agent: agentName,
      players: parseValue(readField(r, 'players')),
      winnings,
      diamondCost: parseValue(readField(r, 'diamondCost')),
      hands: parseValue(readField(r, 'hands')),
      betAmount: parseValue(readField(r, 'betAmount')),

      // Excel percentage values are stored as decimals.
      totalBetAmountPercent: parseValue(readField(r, 'totalBetAmountPercent')) * 100,

      roomQuotaDiamondCost,
      clubProfit,
      diamondConsume,
      accurateProfit,
      realProfit,
      realProfitPercent,
    });
  }

  console.log(`Sheet "${sheetName}" parsed ${gameData.length} data rows`);

  return gameData.length > 0 ? { sheetName, dateRange, data: gameData, percentageInput: 0 } : null;
}

/** Totals for a sheet: the file's own "All Players" row, or a computed fallback. */
function buildSummary(sheet: SheetData): SheetTotals {
  const agentRows = sheet.data.filter((r) => !isSummaryRow(r));
  const reported = sheet.data.find(isSummaryRow);

  if (reported) {
    return { row: reported, computed: false, agents: agentRows.length };
  }

  const sum = (pick: (r: GameData) => number) =>
    agentRows.reduce((total, r) => total + pick(r), 0);

  return {
    computed: true,
    agents: agentRows.length,
    row: {
      agentId: '',
      agent: 'Total (computed)',
      players: sum((r) => r.players),
      winnings: sum((r) => r.winnings),
      diamondCost: sum((r) => r.diamondCost),
      hands: sum((r) => r.hands),
      betAmount: sum((r) => r.betAmount),
      totalBetAmountPercent: sum((r) => r.totalBetAmountPercent),
      roomQuotaDiamondCost: sum((r) => r.roomQuotaDiamondCost),
      clubProfit: sum((r) => r.clubProfit),
      diamondConsume: sum((r) => r.diamondConsume),
      accurateProfit: sum((r) => r.accurateProfit),
      realProfit: sum((r) => r.realProfit),
      realProfitPercent: sum((r) => r.realProfitPercent),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const countFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// "+ 0" turns -0 into 0 so zero never renders as "-0.00".
const formatNumber = (n: number) => numberFormat.format(n + 0);
const formatCount = (n: number) =>
  Number.isInteger(n) ? countFormat.format(n) : formatNumber(n);

const signTone = (n: number) =>
  n < 0 ? 'text-rose-700' : n > 0 ? 'text-emerald-700' : 'text-slate-500';

function renderValue(row: GameData, col: Column): string {
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

function exportCsv(sheetName: string, rows: GameData[]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    COLUMNS.map((c) => escape(c.label)).join(','),
    ...rows.map((row) => COLUMNS.map((c) => escape(row[c.key])).join(',')),
  ];

  // BOM keeps Excel from mangling non-ASCII agent names.
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sheetName.replace(/[^a-z0-9]+/gi, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconName =
  | 'upload'
  | 'download'
  | 'search'
  | 'overview'
  | 'table'
  | 'alert'
  | 'file'
  | 'x'
  | 'sort'
  | 'sort-asc'
  | 'sort-desc';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'upload':
      return (
        <svg {...props}>
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case 'overview':
      return (
        <svg {...props}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'table':
      return (
        <svg {...props}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M9.5 10v9.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="M12 4 2.5 20h19L12 4Z" />
          <path d="M12 10v4m0 3h.01" />
        </svg>
      );
    case 'file':
      return (
        <svg {...props}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'sort-asc':
      return (
        <svg {...props}>
          <path d="m7 14 5-5 5 5" />
        </svg>
      );
    case 'sort-desc':
      return (
        <svg {...props}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
        </svg>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function Kpi({
  label,
  value,
  valueClass = 'text-slate-900',
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 truncate text-xl font-semibold tabular-nums ${valueClass}`} title={value}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Banner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const styles =
    notice.tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <div role="alert" className={`mb-6 flex items-start gap-3 rounded-lg border p-4 ${styles}`}>
      <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 opacity-90">{notice.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
      <img 
        src="https://tongitspinoy.com/img_tg.png" 
        alt="TongitsPinoy Logo"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                 */
/* -------------------------------------------------------------------------- */

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-slate-800 text-white'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded bg-slate-700/60 px-1.5 text-xs tabular-nums text-slate-300">
          {badge}
        </span>
      )}
    </button>
  );
}

function Sidebar({
  sheets,
  activeView,
  onSelect,
  fileName,
}: {
  sheets: SheetData[];
  activeView: string;
  onSelect: (view: string) => void;
  fileName: string;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <BrandMark />
        <div className="leading-tight min-w-0">
          <p className="text-sm font-semibold text-white truncate">{APP_NAME}</p>
          <p className="text-xs text-slate-400">Profit analytics</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Primary">
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          <NavItem
            active={activeView === OVERVIEW}
            onClick={() => onSelect(OVERVIEW)}
            icon="overview"
            label="Overview"
          />
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Games{sheets.length > 0 ? ` (${sheets.length})` : ''}
          </p>
          {sheets.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">Upload a workbook to list games.</p>
          ) : (
            <div className="space-y-0.5">
              {sheets.map((sheet) => (
                <NavItem
                  key={sheet.sheetName}
                  active={activeView === sheet.sheetName}
                  onClick={() => onSelect(sheet.sheetName)}
                  icon="table"
                  label={sheet.sheetName}
                  badge={sheet.data.filter((r) => !isSummaryRow(r)).length}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Data source
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-300" title={fileName}>
          <Icon name="file" className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{fileName || 'No file loaded'}</span>
        </p>
        <p className="mt-4 text-xs text-slate-400 italic">
          {DEVELOPER}
        </p>
      </div>
    </aside>
  );
}

function Header({
  title,
  subtitle,
  sheets,
  activeView,
  onSelect,
  onUpload,
  hasData,
}: {
  title: string;
  subtitle: string;
  sheets: SheetData[];
  activeView: string;
  onSelect: (view: string) => void;
  onUpload: () => void;
  hasData: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight text-slate-900">{title}</h1>
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {hasData && (
          <select
            value={activeView}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Select view"
            className="max-w-[10rem] rounded-md border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-700 lg:hidden"
          >
            <option value={OVERVIEW}>Overview</option>
            {sheets.map((sheet) => (
              <option key={sheet.sheetName} value={sheet.sheetName}>
                {sheet.sheetName}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={onUpload}
          aria-label={hasData ? 'Replace file' : 'Upload file'}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2.5 text-sm sm:px-4 font-medium text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Icon name="upload" className="h-4 w-4" />
          <span className="hidden sm:inline">{hasData ? 'Replace file' : 'Upload file'}</span>
        </button>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Views                                                                      */
/* -------------------------------------------------------------------------- */

function Dropzone({ onFile, onBrowse }: { onFile: (file: File) => void; onBrowse: () => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`rounded-lg border-2 border-dashed bg-white p-6 text-center sm:p-12 transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="upload" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          <span className="hidden sm:inline">Drop your XLSX workbook here</span>
          <span className="sm:hidden">Select your XLSX workbook</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          or browse from your device. Supported formats: .xlsx, .xls
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className="mt-6 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Select file
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Expected worksheets</h3>
        <p className="mt-1 text-sm text-slate-500">
          These sheets are read when present. Anything else in the workbook is ignored.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TARGET_SHEETS.map((name) => (
            <li
              key={name}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              {name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-16">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700"
        role="status"
        aria-label="Loading"
      />
      <p className="mt-4 text-sm font-medium text-slate-700">Processing workbook…</p>
      <p className="mt-1 text-sm text-slate-500">Reading sheets and calculating totals.</p>
    </div>
  );
}

function Methodology() {
  return (
    <p className="text-xs text-slate-500">
      <span className="font-medium text-slate-600">Diamond Consume</span> = Room Quota Diamond Cost ÷{' '}
      {DIAMOND_DIVISOR}
      <span className="mx-2 text-slate-300">|</span>
      <span className="font-medium text-slate-600">Accurate Profit</span> = −Winnings − Diamond Consume
      <span className="mx-2 text-slate-300">|</span>
      <span className="font-medium text-slate-600">Real Profit</span> = Accurate Profit − Diamond Consume
      <span className="mx-2 text-slate-300">|</span>
      <span className="font-medium text-slate-600">Real Profit %</span> = Real Profit × Percentage
    </p>
  );
}

function OverviewView({
  sheets,
  onOpen,
}: {
  sheets: SheetData[];
  onOpen: (sheetName: string) => void;
}) {
  const rows = useMemo(
    () => sheets.map((sheet) => ({ sheet, ...buildSummary(sheet) })),
    [sheets]
  );

  const grand = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          bet: t.bet + r.row.betAmount,
          winnings: t.winnings + r.row.winnings,
          consume: t.consume + r.row.diamondConsume,
          profit: t.profit + r.row.accurateProfit,
          realProfit: t.realProfit + r.row.realProfit,
          realProfitPercent: t.realProfitPercent + r.row.realProfitPercent,
        }),
        { bet: 0, winnings: 0, consume: 0, profit: 0, realProfit: 0, realProfitPercent: 0 }
      ),
    [rows]
  );

  const headCell =
    'border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap';
  const cell = 'border-b border-slate-100 px-4 py-3 tabular-nums whitespace-nowrap';

  return (
    <div className="space-y-6">
      <section aria-label="Totals across all games" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Kpi label="Games loaded" value={String(rows.length)} hint={`of ${TARGET_SHEETS.length} expected`} />
        <Kpi label="Total bet amount" value={formatNumber(grand.bet)} />
        <Kpi label="Total winnings" value={formatNumber(grand.winnings)} />
        <Kpi label="Diamond consume" value={formatNumber(grand.consume)} hint="Calculated" />
        <Kpi
          label="Accurate profit"
          value={formatNumber(grand.profit)}
          valueClass={signTone(grand.profit)}
          hint="Calculated"
        />
        <Kpi
          label="Real profit"
          value={formatNumber(grand.realProfit)}
          valueClass={signTone(grand.realProfit)}
          hint="Calculated"
        />
        <Kpi
          label="Real profit %"
          value={formatNumber(grand.realProfitPercent)}
          valueClass={signTone(grand.realProfitPercent)}
          hint="Based on percentages"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Game summary</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Figures come from each sheet’s All Players row. Select a game to see its agents.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={`${headCell} text-left`}>Game</th>
                <th className={`${headCell} text-left`}>Period</th>
                <th className={`${headCell} text-right`}>Agents</th>
                <th className={`${headCell} text-right`}>Players</th>
                <th className={`${headCell} text-right`}>Bet Amount</th>
                <th className={`${headCell} text-right`}>Winnings</th>
                <th className={`${headCell} bg-blue-50 text-right text-blue-900`}>Diamond Consume</th>
                <th className={`${headCell} bg-blue-50 text-right text-blue-900`}>Accurate Profit</th>
                <th className={`${headCell} bg-blue-50 text-right text-blue-900`}>Real Profit</th>
                <th className={`${headCell} bg-blue-50 text-right text-blue-900`}>Real Profit %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sheet, row, agents, computed }) => (
                <tr
                  key={sheet.sheetName}
                  onClick={() => onOpen(sheet.sheetName)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className={`${cell} font-medium text-slate-900`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(sheet.sheetName);
                      }}
                      className="text-left text-blue-700 hover:underline focus:outline-none focus-visible:underline"
                    >
                      {sheet.sheetName}
                    </button>
                    {computed && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                        computed
                      </span>
                    )}
                  </td>
                  <td className={`${cell} max-w-[260px] truncate text-slate-600`} title={sheet.dateRange}>
                    {sheet.dateRange || '—'}
                  </td>
                  <td className={`${cell} text-right text-slate-700`}>{formatCount(agents)}</td>
                  <td className={`${cell} text-right text-slate-700`}>{formatCount(row.players)}</td>
                  <td className={`${cell} text-right text-slate-700`}>{formatNumber(row.betAmount)}</td>
                  <td className={`${cell} text-right text-slate-700`}>{formatNumber(row.winnings)}</td>
                  <td className={`${cell} bg-blue-50/40 text-right font-medium text-slate-900`}>
                    {formatNumber(row.diamondConsume)}
                  </td>
                  <td className={`${cell} bg-blue-50/40 text-right font-semibold ${signTone(row.accurateProfit)}`}>
                    {formatNumber(row.accurateProfit)}
                  </td>
                  <td className={`${cell} bg-blue-50/40 text-right font-semibold ${signTone(row.realProfit)}`}>
                    {formatNumber(row.realProfit)}
                  </td>
                  <td className={`${cell} bg-blue-50/40 text-right font-semibold ${signTone(row.realProfitPercent)}`}>
                    {formatNumber(row.realProfitPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-900">
                <td className="border-t-2 border-slate-300 px-4 py-3">All games</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-slate-400">—</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-right text-slate-400">—</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-right text-slate-400">—</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums">{formatNumber(grand.bet)}</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums">{formatNumber(grand.winnings)}</td>
                <td className="border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums">{formatNumber(grand.consume)}</td>
                <td className={`border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums ${signTone(grand.profit)}`}>
                  {formatNumber(grand.profit)}
                </td>
                <td className={`border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums ${signTone(grand.realProfit)}`}>
                  {formatNumber(grand.realProfit)}
                </td>
                <td className={`border-t-2 border-slate-300 px-4 py-3 text-right tabular-nums ${signTone(grand.realProfitPercent)}`}>
                  {formatNumber(grand.realProfitPercent)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <Methodology />
        </div>
      </section>
    </div>
  );
}

function GameView({ sheet, onPercentageChange }: { sheet: SheetData; onPercentageChange: (sheetName: string, percentage: number) => void }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [localPercentage, setLocalPercentage] = useState(sheet.percentageInput);
  const [percentText, setPercentText] = useState(String(sheet.percentageInput));
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof GameData>>(() => {
    const isPhone =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    return new Set(isPhone ? MOBILE_DEFAULT_COLUMNS : COLUMNS.map((col) => col.key));
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const handlePercentageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPercentText(e.target.value);
    const value = parseFloat(e.target.value) || 0;
    setLocalPercentage(value);
    onPercentageChange(sheet.sheetName, value);
  };

  const toggleColumn = (key: keyof GameData) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding Agent column (primary identifier)
        if (key === 'agent') return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredColumns = COLUMNS.filter((col) => visibleColumns.has(col.key));

  const summary = useMemo(() => buildSummary(sheet), [sheet]);
  const agentRows = useMemo(() => sheet.data.filter((r) => !isSummaryRow(r)), [sheet]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = agentRows.filter(
      (r) => !q || r.agentId.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q)
    );

    if (sort) {
      const { key, dir } = sort;
      rows = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [agentRows, query, sort]);

  const toggleSort = (col: Column) =>
    setSort((prev) => {
      const first = col.align === 'right' ? 'desc' : 'asc';
      if (!prev || prev.key !== col.key) return { key: col.key, dir: first };
      if (prev.dir === first) return { key: col.key, dir: first === 'asc' ? 'desc' : 'asc' };
      return null;
    });

  const { row } = summary;

  // Close column menu when clicking outside
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };

    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnMenu]);

  return (
    <div className="space-y-6">
      <section
        aria-label={`${sheet.sheetName} totals`}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        <Kpi label="Players" value={formatCount(row.players)} />
        <Kpi label="Hands" value={formatCount(row.hands)} />
        <Kpi label="Bet amount" value={formatNumber(row.betAmount)} />
        <Kpi label="Winnings" value={formatNumber(row.winnings)} />
        <Kpi label="Diamond consume" value={formatNumber(row.diamondConsume)} hint="Calculated" />
        <Kpi
          label="Accurate profit"
          value={formatNumber(row.accurateProfit)}
          valueClass={signTone(row.accurateProfit)}
          hint="Calculated"
        />
        <Kpi
          label="Real profit"
          value={formatNumber(row.realProfit)}
          valueClass={signTone(row.realProfit)}
          hint="Calculated"
        />
        <Kpi
          label={`Real profit ${localPercentage}%`}
          value={formatNumber(row.realProfitPercent)}
          valueClass={signTone(row.realProfitPercent)}
          hint="Based on percentage"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Agent breakdown</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Showing {visibleRows.length} of {agentRows.length} agents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Percentage Input */}
            <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 sm:py-2">
              <label htmlFor="percentage-input" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Profit %
              </label>
              <input
                id="percentage-input"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                value={percentText}
                onChange={handlePercentageInput}
                className="w-16 border-none bg-transparent p-0 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0"
                placeholder="0"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>

            {/* Column Visibility Toggle */}
            <div className="relative" ref={columnMenuRef}>
              <button
                type="button"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:py-2"
                aria-label="Toggle column visibility"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Columns
              </button>

              {showColumnMenu && (
                <div className="fixed inset-x-4 top-24 z-50 rounded-lg border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Show/Hide Columns
                    </p>
                  </div>
                  <div className="max-h-[55dvh] overflow-y-auto p-2 sm:max-h-96">
                    {COLUMNS.map((col) => {
                      const isVisible = visibleColumns.has(col.key);
                      const isRequired = col.key === 'agent';
                      return (
                        <label
                          key={col.key}
                          className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors sm:py-2 ${
                            isRequired
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumn(col.key)}
                            disabled={isRequired}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 sm:h-4 sm:w-4 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed"
                          />
                          <span className="flex-1 text-slate-700">
                            {col.label}
                            {col.calculated && (
                              <span className="ml-1 text-xs text-blue-600">(calc)</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setShowColumnMenu(false)}
                      className="w-full rounded-md bg-slate-100 px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 sm:py-1.5"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agent or ID"
                aria-label="Search agents"
                className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm sm:py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => exportCsv(sheet.sheetName, [...visibleRows, row])}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:py-2"
            >
              <Icon name="download" className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="max-h-[68dvh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {filteredColumns.map((col, i) => {
                  const active = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      title={col.hint}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`sticky top-0 border-b border-slate-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                        col.minWidth ?? ''
                      } ${col.key === 'agent' ? 'left-0 z-20' : 'z-10'} ${
                        col.calculated ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-600'
                      } ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={`inline-flex items-center gap-1 py-1 uppercase tracking-wide hover:text-slate-900 focus:outline-none focus-visible:underline ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {col.label}
                        <Icon
                          name={active ? (sort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort'}
                          className={`h-3.5 w-3.5 ${active ? 'text-slate-900' : 'text-slate-400'}`}
                        />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={filteredColumns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                    No agents match “{query}”.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r, rowIndex) => (
                  <tr key={`${r.agentId}-${rowIndex}`} className="group transition-colors hover:bg-slate-50">
                    {filteredColumns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`border-b border-slate-100 px-3 py-2.5 whitespace-nowrap tabular-nums ${
                          col.key === 'agent'
                            ? 'sticky left-0 z-[1] bg-white font-medium text-slate-900 group-hover:bg-slate-50'
                            : ''
                        } ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                          col.calculated
                            ? `bg-blue-50/40 font-medium group-hover:bg-blue-50 ${
                                col.signed ? signTone(r[col.key] as number) : 'text-slate-900'
                              }`
                            : 'text-slate-700'
                        } ${col.key === 'agentId' ? 'font-mono text-slate-600' : ''}`}
                      >
                        {renderValue(r, col)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr>
                {filteredColumns.map((col, i) => (
                  <td
                    key={col.key}
                    className={`sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 px-3 py-3 font-semibold whitespace-nowrap tabular-nums ${
                      col.key === 'agent' ? 'left-0 z-20' : 'z-10'
                    } ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                      col.signed ? signTone(row[col.key] as number) : 'text-slate-900'
                    }`}
                  >
                    {col.key === 'agent' ? '—' : renderValue(row, col)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="rounded-b-lg border-t border-slate-200 px-4 py-3 sm:px-5">
          <Methodology />
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [sheetsData, setSheetsData] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeView, setActiveView] = useState<string>(OVERVIEW);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle percentage change for a specific sheet
  const handlePercentageChange = (sheetName: string, percentage: number) => {
    setSheetsData((prevSheets) =>
      prevSheets.map((sheet) => {
        if (sheet.sheetName === sheetName) {
          return {
            ...sheet,
            percentageInput: percentage,
            data: sheet.data.map((row) => ({
              ...row,
              realProfitPercent: (row.realProfit * percentage) / 100,
            })),
          };
        }
        return sheet;
      })
    );
  };

  const processFile = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setNotice({
        tone: 'error',
        title: 'Unsupported file type',
        message: `“${file.name}” is not an Excel workbook. Upload an .xlsx or .xls file.`,
      });
      return;
    }

    setIsLoading(true);
    setNotice(null);

    // Let the loading state paint before the (synchronous) parse starts.
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsedSheets: SheetData[] = [];
      const skipped: string[] = [];

      for (const sheetName of TARGET_SHEETS) {
        if (!workbook.SheetNames.includes(sheetName)) {
          console.warn(`Sheet not found: ${sheetName}`);
          skipped.push(sheetName);
          continue;
        }

        const parsed = parseWorksheet(sheetName, workbook.Sheets[sheetName]);
        if (parsed) {
          parsedSheets.push(parsed);
        } else {
          skipped.push(sheetName);
        }
      }

      console.log('Total sheets parsed:', parsedSheets.length);

      if (parsedSheets.length === 0) {
        // Keep whatever was loaded before; a bad upload shouldn't wipe the view.
        setNotice({
          tone: 'error',
          title: 'No data found',
          message:
            'None of the expected worksheets contained a readable Agent ID / Agent header row. Open the browser console for details.',
        });
        return;
      }

      setSheetsData(parsedSheets);
      setFileName(file.name);
      setActiveView(OVERVIEW);

      if (skipped.length > 0) {
        setNotice({
          tone: 'warning',
          title: `${skipped.length} of ${TARGET_SHEETS.length} expected sheets were skipped`,
          message: `${skipped.join(', ')}. They were missing, empty, or had no recognizable header row. See the browser console for details.`,
        });
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setNotice({
        tone: 'error',
        title: 'Could not read file',
        message: `${
          error instanceof Error ? error.message : 'Unknown error'
        }. Make sure it is a valid XLSX file.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) void processFile(file);
  };

  const openPicker = () => inputRef.current?.click();

  const activeSheet = sheetsData.find((s) => s.sheetName === activeView);
  const hasData = sheetsData.length > 0;

  let title = 'Upload workbook';
  let subtitle = 'Import a weekly agent report to calculate Diamond Consume and Accurate Profit';
  if (hasData && activeSheet) {
    title = activeSheet.sheetName;
    subtitle = activeSheet.dateRange || fileName;
  } else if (hasData) {
    title = 'Overview';
    subtitle = `${sheetsData.length} ${sheetsData.length === 1 ? 'game' : 'games'} · ${fileName}`;
  }

  let content: React.ReactNode;
  if (isLoading) {
    content = <LoadingCard />;
  } else if (!hasData) {
    content = <Dropzone onFile={(f) => void processFile(f)} onBrowse={openPicker} />;
  } else if (activeSheet) {
    content = <GameView key={activeSheet.sheetName} sheet={activeSheet} onPercentageChange={handlePercentageChange} />;
  } else {
    content = <OverviewView sheets={sheetsData} onOpen={setActiveView} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload XLSX file"
      />

      <Sidebar
        sheets={sheetsData}
        activeView={activeView}
        onSelect={setActiveView}
        fileName={fileName}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header
          title={title}
          subtitle={subtitle}
          sheets={sheetsData}
          activeView={activeView}
          onSelect={setActiveView}
          onUpload={openPicker}
          hasData={hasData}
        />

        <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-8">
          {notice && <Banner notice={notice} onDismiss={() => setNotice(null)} />}
          {content}
        </main>
      </div>
    </div>
  );
}