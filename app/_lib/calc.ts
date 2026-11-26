import { DIAMOND_DIVISOR } from './config';
import type { GameData, SheetData, SheetTotals } from './types';

export const isSummaryName = (agent: string): boolean =>
  agent.toLowerCase().replace(/\s+/g, '') === 'allplayers';

export const isSummaryRow = (row: GameData): boolean => isSummaryName(row.agent);

export const agentRowsOf = (sheet: SheetData): GameData[] =>
  sheet.data.filter((row) => !isSummaryRow(row));

export function deriveProfit(winnings: number, roomQuotaDiamondCost: number) {
  const diamondConsume = roomQuotaDiamondCost / DIAMOND_DIVISOR;
  const accurateProfit = -winnings - diamondConsume;
  const realProfit = accurateProfit - diamondConsume;
  return { diamondConsume, accurateProfit, realProfit };
}

export const toPercent = (text: string | undefined): number => parseFloat(text ?? '') || 0;

/** Real Profit % = (all agents' Real Profit × percentage) × the row's Total Bet %. */
export function applyPercentage(sheet: SheetData, percentage: number): SheetData {
  const totalRealProfit = agentRowsOf(sheet).reduce((sum, row) => sum + row.realProfit, 0);

  return {
    ...sheet,
    data: sheet.data.map((row) => ({
      ...row,
      realProfitPercent:
        ((totalRealProfit * percentage) / 100) * (row.totalBetAmountPercent / 100),
    })),
  };
}

/** Totals for a sheet: the file's own "All Players" row, or a computed fallback. */
export function buildSummary(sheet: SheetData): SheetTotals {
  const agentRows = agentRowsOf(sheet);
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
      rowId: 'total',
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
