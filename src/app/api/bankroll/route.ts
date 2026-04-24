import { NextResponse } from 'next/server';
import { getBankroll, getResults } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bankroll = await getBankroll();
  const results = await getResults();

  const wins = results.filter((r) => r.result === 'won').length;
  const losses = results.filter((r) => r.result === 'lost').length;
  const totalBets = results.length;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0';

  const totalStaked = results.reduce((sum, r) => sum + r.stake, 0);
  const totalReturns = results.reduce((sum, r) => sum + r.returnAmount, 0);
  const roi = totalStaked > 0 ? (((totalReturns - totalStaked) / totalStaked) * 100).toFixed(1) : '0';

  const pnl = bankroll.currentBalance - bankroll.startingBalance;
  const pnlPercent = ((pnl / bankroll.startingBalance) * 100).toFixed(1);

  const bestWin = results
    .filter((r) => r.result === 'won')
    .reduce((best, r) => (r.returnAmount > (best?.returnAmount || 0) ? r : best), results.find((r) => r.result === 'won') || null);

  // Current streak
  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (let i = results.length - 1; i >= 0; i--) {
    if (!streakType) {
      streakType = results[i].result === 'won' ? 'W' : 'L';
      streak = 1;
    } else if ((results[i].result === 'won' ? 'W' : 'L') === streakType) {
      streak++;
    } else {
      break;
    }
  }

  return NextResponse.json({
    startingBalance: bankroll.startingBalance,
    currentBalance: bankroll.currentBalance,
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent,
    roi,
    winRate,
    totalBets,
    wins,
    losses,
    bestWin: bestWin ? { date: bestWin.date, odds: bestWin.combinedOdds, returnAmount: bestWin.returnAmount } : null,
    streak: streakType ? `${streak}${streakType}` : 'N/A',
    history: bankroll.history,
  });
}
