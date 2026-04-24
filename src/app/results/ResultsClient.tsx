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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Track Record</h1>
        <p className="text-sm text-slate-500">Full history of every daily multi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Win Rate', value: `${wins}W - ${losses}L`, accent: wins > losses },
          { label: 'ROI', value: `${roi}%`, accent: parseFloat(roi) > 0 },
          { label: 'Avg Odds', value: `${avgOdds}x`, accent: true },
          { label: 'Streak', value: streakType ? `${streak}${streakType}` : 'N/A', accent: streakType === 'W' },
          { label: 'P&L', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, accent: pnl >= 0 },
          { label: 'Best Win', value: bestWin ? `+$${(bestWin.returnAmount - bestWin.stake).toFixed(2)}` : '-', accent: true },
          { label: 'Total Staked', value: `$${totalStaked.toFixed(2)}`, accent: false },
          { label: 'Total Returned', value: `$${totalReturns.toFixed(2)}`, accent: totalReturns > totalStaked },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1a1a2e] border border-[#2d2d50] rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
            <div className={`text-lg font-bold mt-1 ${stat.accent ? 'text-[#E8A838]' : 'text-red-400'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bankroll Chart */}
      <div className="bg-[#1a1a2e] border border-[#2d2d50] rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Bankroll Over Time
        </h2>
        <BankrollChart history={bankroll.history.filter((h) => h.balance > 0)} height={220} />
      </div>

      {/* Results Table */}
      <div className="bg-[#1a1a2e] border border-[#2d2d50] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2d2d50]">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            All Results
          </h2>
        </div>
        <div className="divide-y divide-[#2d2d50]/50">
          {[...results].reverse().map((result) => (
            <div key={result.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      result.result === 'won'
                        ? 'bg-[#E8A838]/20 text-[#E8A838]'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {result.result.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-300">
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
                    className={`text-sm font-bold ${
                      result.result === 'won' ? 'text-[#E8A838]' : 'text-red-400'
                    }`}
                  >
                    {result.result === 'won'
                      ? `+$${(result.returnAmount - result.stake).toFixed(2)}`
                      : `-$${result.stake.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.legs.map((leg, i) => (
                  <span
                    key={i}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      leg.result === 'won'
                        ? 'bg-[#E8A838]/10 text-[#E8A838]'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {leg.pick} @ {leg.odds.toFixed(2)}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-1.5 text-[10px] text-slate-600">
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
