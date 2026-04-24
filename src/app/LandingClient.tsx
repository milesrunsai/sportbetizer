'use client';

import { useEffect, useState } from 'react';
import MultiBetCard from '@/components/MultiBetCard';
import BankrollChart from '@/components/BankrollChart';
import type { BankrollData, ResultEntry, DailyMulti } from '@/lib/types';

interface LandingClientProps {
  bankroll: BankrollData;
  results: ResultEntry[];
}

export default function LandingClient({ bankroll, results }: LandingClientProps) {
  const [multi, setMulti] = useState<DailyMulti | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/multi')
      .then((r) => r.json())
      .then((data) => {
        setMulti(data.multi);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const pnl = bankroll.currentBalance - bankroll.startingBalance;
  const pnlPercent = ((pnl / bankroll.startingBalance) * 100).toFixed(1);
  const recentResults = [...results].reverse().slice(0, 7);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
          <span className="text-green-500 glow-text-green">MilesRunsAI</span>{' '}
          <span className="text-white">Sportsbetalizer</span>
        </h1>
        <p className="text-zinc-500 text-lg">3 AI Models. 1 Daily Multi. Real Money.</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
          <span className="text-xs text-zinc-500">LIVE</span>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main: Today's Multi */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Today&apos;s Multi Bet
            </h2>
            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <div className="text-zinc-600 animate-pulse">Generating today&apos;s multi...</div>
              </div>
            ) : multi ? (
              <div className="glow-green rounded-xl">
                <MultiBetCard
                  date={multi.date}
                  legs={multi.legs}
                  combinedOdds={multi.combinedOdds}
                  recommendedStake={multi.recommendedStake}
                  bankroll={bankroll.currentBalance}
                  result={multi.result}
                />
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <div className="text-zinc-600">No multi generated yet today</div>
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Last 7 Days
            </h2>
            <div className="space-y-2">
              {recentResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        result.result === 'won' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm text-zinc-300">
                        {new Date(result.date).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-zinc-600">
                        {result.legs.length} legs @ {result.combinedOdds.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        result.result === 'won' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {result.result === 'won'
                        ? `+$${(result.returnAmount - result.stake).toFixed(2)}`
                        : `-$${result.stake.toFixed(2)}`}
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      Stake: ${result.stake.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Bankroll */}
        <div className="space-y-6">
          {/* Bankroll Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Bankroll
            </h2>
            <div className="text-3xl font-black text-white mb-1">
              ${bankroll.currentBalance.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-sm font-semibold ${
                  pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent}%)
              </span>
              <span className="text-xs text-zinc-600">from ${bankroll.startingBalance}</span>
            </div>
            <BankrollChart
              history={bankroll.history.filter((h) => h.balance > 0)}
              height={160}
            />
          </div>

          {/* Stats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Quick Stats
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Win Rate',
                  value: `${results.filter((r) => r.result === 'won').length}/${results.length}`,
                  sub: `${((results.filter((r) => r.result === 'won').length / results.length) * 100).toFixed(0)}%`,
                },
                {
                  label: 'Best Win',
                  value: `$${Math.max(...results.filter((r) => r.result === 'won').map((r) => r.returnAmount - r.stake), 0).toFixed(2)}`,
                  sub: 'net profit',
                },
                {
                  label: 'Avg Odds',
                  value: `${(results.reduce((s, r) => s + r.combinedOdds, 0) / results.length).toFixed(2)}x`,
                  sub: 'combined',
                },
                {
                  label: 'Total Bets',
                  value: `${results.length}`,
                  sub: 'daily multis',
                },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-zinc-200">{stat.value}</span>
                    <span className="text-[10px] text-zinc-600 ml-1">{stat.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
