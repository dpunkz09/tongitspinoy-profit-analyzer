export interface GameData {
  /** Stable key (the worksheet row), so sorting never confuses two rows. */
  rowId: string;
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

export interface SheetData {
  sheetName: string;
  dateRange: string;
  data: GameData[];
}

export interface SheetTotals {
  row: GameData;
  computed: boolean;
  agents: number;
}

export interface Notice {
  tone: 'error' | 'warning';
  title: string;
  message: string;
}

export type ColumnKey = Exclude<keyof GameData, 'rowId'>;

export type SortState = { key: ColumnKey; dir: 'asc' | 'desc' } | null;

export interface Column {
  key: ColumnKey;
  label: string;
  align: 'left' | 'right';
  kind: 'text' | 'count' | 'number' | 'percent';
  calculated?: boolean;
  signed?: boolean;
  hint?: string;
  minWidth?: string;
  sublabel?: string;
}

export type OverviewKey =
  | 'game'
  | 'period'
  | 'agents'
  | 'players'
  | 'betAmount'
  | 'winnings'
  | 'diamondConsume'
  | 'accurateProfit'
  | 'realProfit'
  | 'realProfitPercent';

export interface OverviewColumn {
  key: OverviewKey;
  label: string;
  align: 'left' | 'right';
  calculated?: boolean;
}

export type Layout = 'cards' | 'table';

/** Choices remembered between visits. `null` columns mean "use the screen's default". */
export interface Prefs {
  percents: Record<string, string>;
  agentColumns: ColumnKey[] | null;
  overviewColumns: OverviewKey[] | null;
  mobileLayout: Layout;
}
