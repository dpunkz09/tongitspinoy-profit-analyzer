import type { Column, ColumnKey, OverviewColumn, OverviewKey } from './types';

export const APP_NAME = 'TongitsPinoy Profit Analyzer';
export const DEVELOPER = 'developed by jpaworx';
export const OVERVIEW = '__overview__';

/** Room Quota Diamond Cost is divided by this to get Diamond Consume. */
export const DIAMOND_DIVISOR = 44;

export const TARGET_SHEETS = [
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

export const COLUMNS: Column[] = [
  { key: 'agent', label: 'Agent', align: 'left', kind: 'text', minWidth: 'min-w-[132px] sm:min-w-[170px]' },
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
    hint: '(All Agent Real Profit × Percentage) × Agent Total Bet %',
    minWidth: 'min-w-[160px]',
    sublabel: '(collab)',
  },
];

/** Columns shown by default on phones (table layout); the rest are in the Columns menu. */
export const MOBILE_DEFAULT_COLUMNS: ColumnKey[] = [
  'agent',
  'agentId',
  'winnings',
  'betAmount',
  'diamondConsume',
  'accurateProfit',
  'realProfit',
  'realProfitPercent',
];

/** Columns of the Overview "Game summary" table, in display order. */
export const OVERVIEW_COLUMNS: OverviewColumn[] = [
  { key: 'game', label: 'Game', align: 'left' },
  { key: 'period', label: 'Period', align: 'left' },
  { key: 'agents', label: 'Agents', align: 'right' },
  { key: 'players', label: 'Players', align: 'right' },
  { key: 'betAmount', label: 'Bet Amount', align: 'right' },
  { key: 'winnings', label: 'Winnings', align: 'right' },
  { key: 'diamondConsume', label: 'Diamond Consume', align: 'right', calculated: true },
  { key: 'accurateProfit', label: 'Accurate Profit', align: 'right', calculated: true },
  { key: 'realProfit', label: 'Real Profit', align: 'right', calculated: true },
  { key: 'realProfitPercent', label: 'Real Profit %', align: 'right', calculated: true },
];

export const MOBILE_OVERVIEW_COLUMNS: OverviewKey[] = [
  'game',
  'betAmount',
  'winnings',
  'accurateProfit',
  'realProfit',
  'realProfitPercent',
];
