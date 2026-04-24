'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MultiBetCard from '@/components/MultiBetCard';
import BankrollChart from '@/components/BankrollChart';
import ModelIcon from '@/components/ModelIcon';
import type { BankrollData, ResultEntry, DailyMulti, AnalyzedEvent } from '@/lib/types';

interface LandingClientProps {
  bankroll: BankrollData;
  results: ResultEntry[];
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'LIVE';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function CountdownPill({ startTime, now }: { startTime: string; now: number }) {
  const diff = new Date(startTime).getTime() - now;
  const isLive = diff <= 0;
  const text = formatCountdown(diff);
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
      isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-[#1a1a1a] text-[#f47920]'
    }`}>
      {text}
    </span>
  );
}

function SkyBadge() {
  return (
    <span className="bg-[#003f7f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
      SKY
    </span>
  );
}

interface NextRace {
  track: string;
  race: string;
  startTime: string;
}

export default function LandingClient({ bankroll, results }: LandingClientProps) {
  const [multi, setMulti] = useState<DailyMulti | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextHorses, setNextHorses] = useState<NextRace[]>([]);
  const [nextDogs, setNextDogs] = useState<NextRace[]>([]);
  const [nextHarness, setNextHarness] = useState<NextRace[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load races first (fast), then multi+analyze in background
    fetch('/api/scrape').then(r => r.json()).then(scrapeData => {
        const events = scrapeData.events || [];
        const horses: NextRace[] = [];
        const dogs: NextRace[] = [];
        const harness: NextRace[] = [];

        for (const ev of events) {
          // Match both "Race 8" and "VENUE R8 NAME" formats
          const raceMatch = ev.event.match(/Race\s+(\d+)/i) || ev.event.match(/\bR(\d+)\b/);
          const race = raceMatch ? `R${raceMatch[1]}` : '';
          const track = (ev.venue || '').split('(')[0].trim().split(',')[0].trim() || ev.event.split(' ')[0];
          const entry = { track, race, startTime: ev.startTime };

          const sport = (ev.sport || '').toLowerCase();
          if (sport.includes('greyhound') || sport.includes('dog')) {
            dogs.push(entry);
          } else if (sport.includes('harness')) {
            harness.push(entry);
          } else {
            horses.push(entry);
          }
        }

        // Sort by start time and take top 5
        const sortByTime = (a: NextRace, b: NextRace) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        setNextHorses(horses.sort(sortByTime).slice(0, 5));
        setNextDogs(dogs.sort(sortByTime).slice(0, 5));
        setNextHarness(harness.sort(sortByTime).slice(0, 5));

        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load multi and analyze in background (don't block page)
    fetch('/api/multi').then(r => r.json()).then(d => setMulti(d.multi)).catch(() => {});
    fetch('/api/analyze').then(r => r.json()).then(d => setAnalyzed(d.analyzed || [])).catch(() => {});
  }, []);

  const pnl = bankroll.currentBalance - bankroll.startingBalance;
  const pnlPercent = ((pnl / bankroll.startingBalance) * 100).toFixed(1);
  const recentResults = [...results].reverse().slice(0, 7);
  const wins = results.filter((r) => r.result === 'won').length;

  const consensusPicks = analyzed.filter((a) => a.consensus === 'AGREE');
  const highConfPicks = consensusPicks.filter((a) => a.confidenceLevel === 'high');

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* AI Quick Multis Section */}
      <div className="mb-6">
        <h2 className="text-[15px] font-bold text-[#333] mb-3">AI Quick Multis</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* High Confidence Multi */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="bg-[#003f7f] px-4 py-2 flex items-center justify-between">
              <span className="text-white text-[12px] font-bold">HIGH CONFIDENCE</span>
              <span className="bg-[#c8a415] text-white text-[10px] font-bold px-2 py-0.5 rounded">3/3 AGREE</span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-[13px] text-[#666] animate-pulse">Loading today&apos;s picks...</div>
              ) : multi ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[13px] font-bold text-[#333]">Today&apos;s Multi</div>
                      <div className="text-[11px] text-[#666]">{multi.legs.length} legs</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-black text-[#f47920]">{multi.combinedOdds.toFixed(2)}</div>
                      <div className="text-[10px] text-[#666]">combined odds</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {multi.legs.slice(0, 3).map((leg, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#666]">{i + 1}.</span>
                          <span className="font-medium text-[#333]">{leg.pick}</span>
                        </div>
                        <span className="odds-btn text-[11px] py-1 px-2">{leg.odds.toFixed(2)}</span>
                      </div>
                    ))}
                    {multi.legs.length > 3 && (
                      <div className="text-[11px] text-[#666]">+{multi.legs.length - 3} more legs</div>
                    )}
                  </div>
                  <Link href="/analysis" className="cta-orange block text-center text-[13px] py-2.5">
                    View Full Analysis @ {multi.combinedOdds.toFixed(2)}
                  </Link>
                </>
              ) : (
                <div className="text-[13px] text-[#666]">No multi generated yet today</div>
              )}
            </div>
          </div>

          {/* Value Multi */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="bg-[#00a651] px-4 py-2 flex items-center justify-between">
              <span className="text-white text-[12px] font-bold">BEST VALUE</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">TOP ODDS</span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-[13px] text-[#666] animate-pulse">Loading value picks...</div>
              ) : multi ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[13px] font-bold text-[#333]">Value Multi</div>
                      <div className="text-[11px] text-[#666]">{Math.max(2, multi.legs.length - 1)} legs</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-black text-[#00a651]">
                        {(multi.combinedOdds * 1.3).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#666]">combined odds</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {multi.legs.slice(0, 3).map((leg, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#666]">{i + 1}.</span>
                          <span className="font-medium text-[#333]">{leg.pick}</span>
                        </div>
                        <span className="odds-btn text-[11px] py-1 px-2">{(leg.odds * 1.1).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/analysis" className="cta-orange block text-center text-[13px] py-2.5 !bg-[#00a651] hover:!bg-[#008c44]">
                    View Full Analysis @ {(multi.combinedOdds * 1.3).toFixed(2)}
                  </Link>
                </>
              ) : (
                <div className="text-[13px] text-[#666]">No value picks today</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next To Jump Section */}
      <div className="mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'Next Horses', icon: '\u{1F3C7}', races: nextHorses },
            { title: 'Next Greyhounds', icon: '\u{1F415}', races: nextDogs },
            { title: 'Next Harness', icon: '\u{1F3CE}', races: nextHarness },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
              <div className="px-4 py-2.5 border-b border-[#e5e5e5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{section.icon}</span>
                  <span className="text-[13px] font-bold text-[#333]">{section.title}</span>
                </div>
                <Link href="/analysis" className="text-[11px] text-[#004a99] hover:underline font-medium">
                  See all
                </Link>
              </div>
              <div className="divide-y divide-[#f0f0f0]">
                {section.races.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[#999]">No upcoming races</div>
                ) : (
                  section.races.map((race, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between">
                      <div>
                        <div className="text-[12px] font-medium text-[#333]">{race.track}</div>
                        <div className="text-[11px] text-[#666]">{race.race}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SkyBadge />
                        <CountdownPill startTime={race.startTime} now={now} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: Today's Multi + Featured Events */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-[15px] font-bold text-[#333] mb-3">Today&apos;s Multi Bet</h2>
            {loading ? (
              <div className="bg-white border border-[#e5e5e5] rounded-lg p-8 text-center shadow-sm">
                <div className="text-[#999] animate-pulse text-[13px]">Generating today&apos;s multi...</div>
              </div>
            ) : multi ? (
              <MultiBetCard
                date={multi.date}
                legs={multi.legs}
                combinedOdds={multi.combinedOdds}
                recommendedStake={multi.recommendedStake}
                bankroll={bankroll.currentBalance}
                result={multi.result}
              />
            ) : (
              <div className="bg-white border border-[#e5e5e5] rounded-lg p-8 text-center shadow-sm">
                <div className="text-[#999] text-[13px]">No multi generated yet today</div>
              </div>
            )}
          </div>

          {/* Featured Events / AI Picks carousel */}
          {analyzed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-[#333]">Featured AI Picks</h2>
                <Link href="/analysis" className="text-[12px] text-[#004a99] hover:underline font-medium">
                  View all picks
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {analyzed.slice(0, 6).map((analysis) => (
                  <div
                    key={analysis.event.id}
                    className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm min-w-[280px] max-w-[300px] shrink-0 overflow-hidden"
                  >
                    <div className="bg-[#003f7f] px-3 py-2">
                      <div className="text-white text-[12px] font-bold truncate">{analysis.event.event}</div>
                      <div className="text-white/60 text-[10px]">{analysis.event.venue}</div>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Object.entries(analysis.event.odds).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-[10px] text-[#666] truncate max-w-[70px]">{key}</div>
                            <button
                              className={`odds-btn text-[11px] py-1 px-2 ${
                                analysis.consensusPick === key ? 'active' : ''
                              }`}
                            >
                              {value.toFixed(2)}
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {[
                          { model: 'claude' as const, agrees: analysis.claudePick.pick === analysis.consensusPick },
                          { model: 'gpt' as const, agrees: analysis.gptPick.pick === analysis.consensusPick },
                          { model: 'gemini' as const, agrees: analysis.geminiPick.pick === analysis.consensusPick },
                        ].map(({ model, agrees }) => (
                          <ModelIcon key={model} model={model} agrees={agrees} size="sm" />
                        ))}
                        <span className={`text-[10px] font-bold ml-1 ${
                          analysis.confidenceLevel === 'high' ? 'text-[#00a651]' : 'text-[#004a99]'
                        }`}>
                          {analysis.agreementCount}/3
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Model Tips */}
          <div>
            <h2 className="text-[15px] font-bold text-[#333] mb-3">AI Model Tips</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { model: 'claude' as const, name: 'Claude', color: '#A855F7' },
                { model: 'gpt' as const, name: 'GPT', color: '#10B981' },
                { model: 'gemini' as const, name: 'Gemini', color: '#3B82F6' },
              ].map(({ model, name, color }) => {
                const topPick = analyzed.find((a) => {
                  const pick = model === 'claude' ? a.claudePick : model === 'gpt' ? a.gptPick : a.geminiPick;
                  return pick.confidence >= 7;
                });
                const pick = topPick
                  ? model === 'claude' ? topPick.claudePick : model === 'gpt' ? topPick.gptPick : topPick.geminiPick
                  : null;

                return (
                  <div key={model} className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ModelIcon model={model} size="sm" />
                      <div>
                        <div className="text-[12px] font-bold text-[#333]">{name}&apos;s Top Pick</div>
                        <div className="text-[10px] text-[#666]">Best pick of the day</div>
                      </div>
                    </div>
                    {topPick && pick ? (
                      <>
                        <div className="text-[11px] text-[#666] mb-1">{topPick.event.event}</div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-bold" style={{ color }}>{pick.pick}</span>
                          <span className="odds-btn text-[11px] py-1 px-2">
                            {topPick.event.odds[pick.pick]?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#666] leading-relaxed line-clamp-2">{pick.reasoning}</p>
                      </>
                    ) : (
                      <div className="text-[12px] text-[#999]">No high-confidence pick today</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-[#333]">Last 7 Days</h2>
              <Link href="/results" className="text-[12px] text-[#004a99] hover:underline font-medium">
                View all results
              </Link>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm divide-y divide-[#f0f0f0]">
              {recentResults.map((result) => (
                <div key={result.id} className="px-4 py-2.5 flex items-center justify-between">
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
                    <div>
                      <div className="text-[12px] text-[#333] font-medium">
                        {new Date(result.date).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-[11px] text-[#999]">
                        {result.legs.length} legs @ {result.combinedOdds.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-[13px] font-bold ${
                        result.result === 'won' ? 'text-[#00a651]' : 'text-[#d32f2f]'
                      }`}
                    >
                      {result.result === 'won'
                        ? `+$${(result.returnAmount - result.stake).toFixed(2)}`
                        : `-$${result.stake.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Bankroll Tracker */}
          <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4">
            <h2 className="text-[12px] font-bold text-[#666] uppercase tracking-wider mb-3">
              Bankroll Tracker
            </h2>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[24px] font-black text-[#333]">
                ${bankroll.currentBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[13px] font-bold ${
                  pnl >= 0 ? 'text-[#00a651]' : 'text-[#d32f2f]'
                }`}
              >
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent}%)
              </span>
              <span className="text-[11px] text-[#999]">from ${bankroll.startingBalance}</span>
            </div>
            <BankrollChart
              history={bankroll.history.filter((h) => h.balance > 0)}
              height={140}
            />
          </div>

          {/* Quick Stats */}
          <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4">
            <h2 className="text-[12px] font-bold text-[#666] uppercase tracking-wider mb-3">
              Quick Stats
            </h2>
            <div className="space-y-2.5">
              {[
                {
                  label: 'Win Rate',
                  value: `${wins}/${results.length}`,
                  sub: `${results.length > 0 ? ((wins / results.length) * 100).toFixed(0) : 0}%`,
                  positive: wins > results.length / 2,
                },
                {
                  label: 'Best Win',
                  value: `$${Math.max(...results.filter((r) => r.result === 'won').map((r) => r.returnAmount - r.stake), 0).toFixed(2)}`,
                  sub: 'net profit',
                  positive: true,
                },
                {
                  label: 'Avg Odds',
                  value: `${results.length > 0 ? (results.reduce((s, r) => s + r.combinedOdds, 0) / results.length).toFixed(2) : '0'}x`,
                  sub: 'combined',
                  positive: true,
                },
                {
                  label: 'Total Bets',
                  value: `${results.length}`,
                  sub: 'daily multis',
                  positive: true,
                },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#666]">{stat.label}</span>
                  <div className="text-right">
                    <span className={`text-[13px] font-bold ${stat.positive ? 'text-[#333]' : 'text-[#d32f2f]'}`}>
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-[#999] ml-1">{stat.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Consensus Summary */}
          <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4">
            <h2 className="text-[12px] font-bold text-[#666] uppercase tracking-wider mb-3">
              Today&apos;s AI Consensus
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#666]">Events Analyzed</span>
                <span className="font-bold text-[#333]">{analyzed.length}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#666]">Consensus Picks</span>
                <span className="font-bold text-[#00a651]">{consensusPicks.length}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#666]">High Confidence (3/3)</span>
                <span className="font-bold text-[#c8a415]">{highConfPicks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
