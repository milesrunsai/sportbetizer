'use client';

import BankrollChart from '@/components/BankrollChart';
import type { BankrollData, ResultEntry } from '@/lib/types';

interface ResultsClientProps {
  bankroll: BankrollData;
  results: ResultEntry[];
}

export default function ResultsClient({ bankroll, results }: ResultsClientProps) {
  const wins = results.filter((r) => r.result === 'won').length;
  const losses = results.filter((r) => r.result === 'lost').length;
  const totalStaked = results.reduce((s, r) => s + r.stake, 0);
  const totalReturns = results.reduce((s, r) => s + r.returnAmount, 0);
  const roi = totalStaked > 0 ? (((totalReturns - totalStaked) / totalStaked) * 100).toFixed(1) : '0';
  const pnl = bankroll.currentBalance - bankroll.startingBalance;
  const avgOdds = results.length > 0 ? (results.reduce((s, r) => s + r.combinedOdds, 0) / results.length).toFixed(2) : '0';
  const bestWin = results
    .filter((r) => r.result === 'won')
    .reduce<ResultEntry | null>((best, r) => (!best || r.returnAmount > best.returnAmount ? r : best), null);

  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (let i = results.length - 1; i >= 0; i--) {
    const type = results[i].result === 'won' ? 'W' : 'L';
    if (!streakType) {
      streakType = type;
      streak = 1;
    } else if (type === streakType) {
      streak++;
    } else break;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-[#333]">Track Record</h1>
        <p className="text-[12px] text-[#666]">Full history of every daily multi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Win Rate', value: `${wins}W - ${losses}L`, positive: wins > losses },
          { label: 'ROI', value: `${roi}%`, positive: parseFloat(roi) > 0 },
          { label: 'Avg Odds', value: `${avgOdds}x`, positive: true },
          { label: 'Streak', value: streakType ? `${streak}${streakType}` : 'N/A', positive: streakType === 'W' },
          { label: 'P&L', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, positive: pnl >= 0 },
          { label: 'Best Win', value: bestWin ? `+$${(bestWin.returnAmount - bestWin.stake).toFixed(2)}` : '-', positive: true },
          { label: 'Total Staked', value: `$${totalStaked.toFixed(2)}`, positive: true },
          { label: 'Total Returned', value: `$${totalReturns.toFixed(2)}`, positive: totalReturns > totalStaked },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-3">
            <div className="text-[10px] text-[#999] uppercase tracking-wider">{stat.label}</div>
            <div className={`text-[16px] font-bold mt-1 ${stat.positive ? 'text-[#00a651]' : 'text-[#d32f2f]'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bankroll Chart */}
      <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4 mb-4">
        <h2 className="text-[12px] font-bold text-[#666] uppercase tracking-wider mb-3">
          Bankroll Over Time
        </h2>
        <BankrollChart history={bankroll.history.filter((h) => h.balance > 0)} height={220} />
      </div>

      {/* Results Table */}
      <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5e5e5] bg-[#f9f9f9]">
          <h2 className="text-[12px] font-bold text-[#666] uppercase tracking-wider">
            All Results
          </h2>
        </div>
        <div className="divide-y divide-[#f0f0f0]">
          {[...results].reverse().map((result) => (
            <div key={result.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      result.result === 'won'
                        ? 'bg-[#00a651]/10 text-[#00a651]'
                        : 'bg-[#d32f2f]/10 text-[#d32f2f]'
                    }`}
                  >
                    {result.result.toUpperCase()}
                  </span>
                  <span className="text-[12px] text-[#333] font-medium">
                    {new Date(result.date).toLocaleDateString('en-AU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[13px] font-bold ${
                      result.result === 'won' ? 'text-[#00a651]' : 'text-[#d32f2f]'
                    }`}
                  >
                    {result.result === 'won'
                      ? `+$${(result.returnAmount - result.stake).toFixed(2)}`
                      : `-$${result.stake.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.legs.map((leg, i) => (
                  <span
                    key={i}
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      leg.result === 'won'
                        ? 'bg-[#00a651]/5 text-[#00a651] border-[#00a651]/20'
                        : 'bg-[#d32f2f]/5 text-[#d32f2f] border-[#d32f2f]/20'
                    }`}
                  >
                    {leg.pick} @ {leg.odds.toFixed(2)}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-1.5 text-[10px] text-[#999]">
                <span>Combined: {result.combinedOdds.toFixed(2)}x</span>
                <span>Stake: ${result.stake.toFixed(2)}</span>
                <span>Return: ${result.returnAmount.toFixed(2)}</span>
                <span>Bankroll: ${result.bankrollAfter.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
