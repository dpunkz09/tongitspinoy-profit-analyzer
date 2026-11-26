import type { WorkSheet } from 'xlsx';
import { deriveProfit, isSummaryName } from './calc';
import { TARGET_SHEETS } from './config';
import type { GameData, SheetData } from './types';

/** The spreadsheet library is large, so it is downloaded only when it is needed. */
export const loadXlsx = () => import('xlsx');

type XlsxUtils = Awaited<ReturnType<typeof loadXlsx>>['utils'];

type Field =
  | 'agentId'
  | 'agent'
  | 'players'
  | 'winnings'
  | 'diamondCost'
  | 'hands'
  | 'betAmount'
  | 'totalBetAmountPercent'
  | 'roomQuotaDiamondCost'
  | 'clubProfit';

const HEADER_ALIASES: Record<Field, string[]> = {
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

/** header text -> field, built once instead of searching every alias for every cell. */
const FIELD_BY_HEADER = new Map<string, Field>(
  (Object.keys(HEADER_ALIASES) as Field[]).flatMap((field) =>
    HEADER_ALIASES[field].map((alias): [string, Field] => [alias, field])
  )
);

/** Without these columns the profit figures would silently come out wrong. */
const REQUIRED_FOR_PROFIT: Array<[Field, string]> = [
  ['winnings', 'Winnings'],
  ['roomQuotaDiamondCost', 'Room Quota Diamond Cost'],
];

const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const parseValue = (value: unknown): number => {
  if (value === '/' || value === undefined || value === null || value === '') {
    return 0;
  }

  const text = String(value).replace(/,/g, '').trim();
  const isPercentText = text.endsWith('%');
  const parsed = Number(isPercentText ? text.slice(0, -1) : text);
  if (!Number.isFinite(parsed)) return 0;
  return isPercentText ? parsed / 100 : parsed;
};

type SheetResult =
  | { ok: true; sheet: SheetData; missing: string[] }
  | { ok: false; reason: string };

export function parseWorksheet(
  utils: XlsxUtils,
  sheetName: string,
  worksheet: WorkSheet | undefined
): SheetResult {
  if (!worksheet || !worksheet['!ref']) return { ok: false, reason: 'empty' };

  // Rebuild the real range from the cells that exist, because the sheet's own
  // !ref value can be wrong.
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;

  for (const address of Object.keys(worksheet)) {
    if (!/^[A-Z]+[0-9]+$/.test(address)) continue;
    const { r, c } = utils.decode_cell(address);
    if (r < minR) minR = r;
    if (c < minC) minC = c;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }

  if (maxR === -Infinity) return { ok: false, reason: 'empty' };

  const getCell = (r: number, c: number): unknown =>
    worksheet[utils.encode_cell({ r, c })]?.v ?? '';

  // Find the actual header row and column positions.
  let headerRow = -1;
  let columns: Partial<Record<Field, number>> = {};

  for (let r = minR; r <= maxR && headerRow === -1; r++) {
    const found: Partial<Record<Field, number>> = {};

    for (let c = minC; c <= maxC; c++) {
      const field = FIELD_BY_HEADER.get(normalizeHeader(getCell(r, c)));
      if (field) found[field] = c;
    }

    if (found.agentId !== undefined && found.agent !== undefined) {
      headerRow = r;
      columns = found;
    }
  }

  if (headerRow === -1) return { ok: false, reason: 'no Agent ID / Agent header row' };

  // The date range is the first non-empty cell above the header row.
  let dateRange = '';

  for (let r = minR; r < headerRow && !dateRange; r++) {
    for (let c = minC; c <= maxC; c++) {
      const value = getCell(r, c);
      if (value !== '') {
        dateRange = String(value);
        break;
      }
    }
  }

  const readField = (r: number, field: Field): unknown => {
    const c = columns[field];
    return c === undefined ? '' : getCell(r, c);
  };

  const data: GameData[] = [];

  for (let r = headerRow + 1; r <= maxR; r++) {
    const agentId = String(readField(r, 'agentId')).trim();
    const agent = String(readField(r, 'agent')).trim();

    // Keep the "All Players" summary row, skip anything without a numeric ID.
    if (!isSummaryName(agent) && !/^\d+$/.test(agentId)) continue;

    const num = (field: Field) => parseValue(readField(r, field));
    const winnings = num('winnings');
    const roomQuotaDiamondCost = num('roomQuotaDiamondCost');

    data.push({
      rowId: `r${r}`,
      agentId,
      agent,
      players: num('players'),
      winnings,
      diamondCost: num('diamondCost'),
      hands: num('hands'),
      betAmount: num('betAmount'),
      // Excel percentage values are stored as decimals.
      totalBetAmountPercent: num('totalBetAmountPercent') * 100,
      roomQuotaDiamondCost,
      clubProfit: num('clubProfit'),
      ...deriveProfit(winnings, roomQuotaDiamondCost),
      realProfitPercent: 0, // Applied later from the Profit % input.
    });
  }

  if (data.length === 0) return { ok: false, reason: 'no agent rows' };

  return {
    ok: true,
    sheet: { sheetName, dateRange, data },
    missing: REQUIRED_FOR_PROFIT.filter(([f]) => columns[f] === undefined).map(([, label]) => label),
  };
}

const looseName = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export async function readWorkbook(file: File) {
  const [XLSX, buffer] = await Promise.all([loadXlsx(), file.arrayBuffer()]);

  const workbook = XLSX.read(buffer, {
    type: 'array',
    // Only raw cell values are used, so skip the extra work.
    cellFormula: false,
    cellHTML: false,
    cellText: false,
  });
  const { SheetNames } = workbook;

  // Tolerate differences in capitals and spacing ("Mines 2.0" vs "Mines2.0").
  const found = new Map<string, string>();
  for (const target of TARGET_SHEETS) {
    const actual =
      SheetNames.find((name) => name === target) ??
      SheetNames.find((name) => looseName(name) === looseName(target));
    if (actual !== undefined) found.set(target, actual);
  }

  const sheets: SheetData[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (const target of TARGET_SHEETS) {
    const actual = found.get(target);
    if (actual === undefined) {
      skipped.push(`${target} (not in file)`);
      continue;
    }

    const result = parseWorksheet(XLSX.utils, target, workbook.Sheets[actual]);
    if (!result.ok) {
      skipped.push(`${target} (${result.reason})`);
      continue;
    }

    sheets.push(result.sheet);
    if (result.missing.length) {
      warnings.push(`${target} has no ${result.missing.join(' or ')} column, so it counts as 0`);
    }
  }

  return { sheets, skipped, warnings };
}
