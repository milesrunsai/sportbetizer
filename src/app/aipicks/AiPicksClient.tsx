'use client';

import { useState, useEffect, useMemo } from 'react';
import ModelIcon from '@/components/ModelIcon';
import type { SportEvent, AnalyzedEvent } from '@/lib/types';

const TAB_API = 'https://api.beta.tab.com.au/v1/tab-info-service';

const AU_STATES = new Set(['NSW', 'VIC', 'SA', 'QLD', 'WA', 'TAS', 'ACT', 'NT']);

interface TabRunner {
  runnerName: string;
  runnerNumber: number;
  barrierNumber: number;
  riderDriverName?: string;
  trainerName?: string;
  handicapWeight?: number;
  last5Starts?: string;
  dfsFormRating?: number;
  totalRatingPoints?: number;
  fixedOdds?: {
    returnWin: number;
    returnPlace: number;
    bettingStatus: string;
  };
  parimutuel?: {
    returnWin: number;
    returnPlace: number;
  };
}

interface TabRaceDetail {
  raceNumber: number;
  raceName: string;
  raceDistance: number;
  raceStartTime: string;
  raceStatus: string;
  runners: TabRunner[];
}

interface TabNextToGoRace {
  raceStartTime: string;
  raceNumber: number;
  raceName: string;
  raceDistance: number;
  meeting: {
    raceType: string;
    meetingName: string;
    location: string;
    venueMnemonic: string;
    meetingDate: string;
    weatherCondition?: string;
    trackCondition?: string;
  };
  _links: {
    self: string;
  };
}

function transformTabRace(
  ntgRace: TabNextToGoRace,
  detail: TabRaceDetail
): SportEvent & { runners: Runner[] } {
  const runners: Runner[] = detail.runners
    .filter(r => r.fixedOdds && r.fixedOdds.bettingStatus === 'Open' && r.fixedOdds.returnWin > 0)
    .map(r => ({
      name: r.runnerName,
      number: r.runnerNumber,
      barrier: r.barrierNumber,
      jockey: r.riderDriverName || '',
      trainer: r.trainerName || '',
      weight: r.handicapWeight || 0,
      form: r.last5Starts || '',
      career: '',
      winOdds: r.fixedOdds?.returnWin || 0,
    }));

  const odds: Record<string, number> = {};
  for (const r of runners) {
    odds[r.name] = r.winOdds;
  }

  return {
    id: `horse-racing-${ntgRace.meeting.venueMnemonic.toLowerCase()}-r${ntgRace.raceNumber}`,
    sport: 'Horse Racing',
    event: `${ntgRace.meeting.meetingName} R${ntgRace.raceNumber} ${ntgRace.raceName}`,
    teams: runners.map(r => r.name),
    odds,
    startTime: ntgRace.raceStartTime,
    venue: `${ntgRace.meeting.meetingName} (${ntgRace.meeting.location})`,
    runners,
  };
}

async function fetchInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>,
  batchSize: number,
  delayMs: number
): Promise<(R | null)[]> {
  const results: (R | null)[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
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

interface SrmPick {
  name: string;
  reasoning: string;
}

interface SrmSuggestion {
  picks: SrmPick[];
  confidence: number;
  summary: string;
}

interface Runner {
  name: string;
  number: number;
  barrier: number;
  jockey: string;
  trainer: string;
  weight: number;
  form: string;
  career: string;
  winOdds: number;
}

interface AiPicksClientProps {
  events: SportEvent[];
  analyzed: AnalyzedEvent[];
}

// Same Race Multi selection: raceId -> runner names
type SameRaceMulti = Record<string, Set<string>>;

export default function AiPicksClient({ events: serverEvents, analyzed }: AiPicksClientProps) {
  const [sameRaceSelections, setSameRaceSelections] = useState<Record<string, string[]>>({});
  const [dailyMultiSelections, setDailyMultiSelections] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [liveAnalyzed, setLiveAnalyzed] = useState<AnalyzedEvent[]>(analyzed);
  const [now, setNow] = useState(Date.now());
  const [srmSuggestions, setSrmSuggestions] = useState<Record<string, SrmSuggestion>>({});
  const [srmLoading, setSrmLoading] = useState<Record<string, boolean>>({});

  const events = serverEvents;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);



  // Map analyzed events by event id for quick lookup
  const analysisMap = useMemo(() => {
    const map = new Map<string, AnalyzedEvent>();
    for (const a of liveAnalyzed) {
      map.set(a.event.id, a);
    }
    return map;
  }, [liveAnalyzed]);

  // Build daily multi from consensus picks
  const dailyMultiLegs = useMemo(() => {
    const legs: { eventId: string; event: string; venue: string; pick: string; odds: number; agreement: number }[] = [];
    for (const a of liveAnalyzed) {
      if (a.consensusPick && a.agreementCount >= 2) {
        const odds = a.event.odds[a.consensusPick] || 0;
        if (odds > 0) {
          legs.push({
            eventId: a.event.id,
            event: a.event.event,
            venue: a.event.venue,
            pick: a.consensusPick,
            odds,
            agreement: a.agreementCount,
          });
        }
      }
    }
    return legs;
  }, [liveAnalyzed]);

  const dailyMultiOdds = useMemo(() => {
    if (dailyMultiLegs.length === 0) return 0;
    return dailyMultiLegs.reduce((acc, leg) => acc * leg.odds, 1);
  }, [dailyMultiLegs]);

  // Same race multi odds calculation
  function getSameRaceMultiOdds(raceId: string): number {
    const selections = sameRaceSelections[raceId] || [];
    if (selections.length < 2) return 0;
    const event = events.find(e => e.id === raceId);
    if (!event) return 0;
    return selections.reduce((acc, name) => acc * (event.odds[name] || 1), 1);
  }

  function toggleSameRacePick(raceId: string, runnerName: string) {
    setSameRaceSelections(prev => {
      const current = prev[raceId] || [];
      const next = current.includes(runnerName)
        ? current.filter(n => n !== runnerName)
        : [...current, runnerName];
      return { ...prev, [raceId]: next };
    });
  }

  function toggleDailyMultiPick(eventId: string, pick: string) {
    setDailyMultiSelections(prev => {
      if (prev[eventId] === pick) {
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return { ...prev, [eventId]: pick };
    });
  }

  const customDailyMultiOdds = useMemo(() => {
    const picks = Object.entries(dailyMultiSelections);
    if (picks.length === 0) return 0;
    return picks.reduce((acc, [eventId, pick]) => {
      const event = events.find(e => e.id === eventId);
      return acc * (event?.odds[pick] || 1);
    }, 1);
  }, [dailyMultiSelections, events]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze');
      const data = await res.json();
      if (data.analyzed) {
        setLiveAnalyzed(data.analyzed);
      }
    } catch {
      // ignore
    }
    setAnalyzing(false);
  }

  async function fetchSrm(event: SportEvent) {
    setSrmLoading(prev => ({ ...prev, [event.id]: true }));
    try {
      const res = await fetch('/api/srm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (data.suggestion) {
        setSrmSuggestions(prev => ({ ...prev, [event.id]: data.suggestion }));
        // Auto-select SRM picks
        const names = data.suggestion.picks.map((p: SrmPick) => p.name);
        setSameRaceSelections(prev => ({ ...prev, [event.id]: names }));
      }
    } catch {
      // ignore
    }
    setSrmLoading(prev => ({ ...prev, [event.id]: false }));
  }

  const hasAnalysis = liveAnalyzed.length > 0;
  const consensusCount = liveAnalyzed.filter(a => a.consensus === 'AGREE').length;
  const highConfCount = liveAnalyzed.filter(a => a.confidenceLevel === 'high').length;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#003f7f] to-[#002a57] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">AI Race Picks</h1>
              <p className="text-white/70 text-sm mt-1">
                {events.length} races &middot; 3 AI models &middot; Consensus picks
              </p>
            </div>
            {!hasAnalysis && events.length > 0 && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-[#f47920] hover:bg-[#e06810] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm"
              >
                {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            )}
            {hasAnalysis && (
              <div className="text-right text-sm">
                <div className="text-white/60">Analysis Complete</div>
                <div className="font-bold">{consensusCount} consensus &middot; {highConfCount} high conf</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content - Race Cards */}
          <div className="lg:col-span-2 space-y-4">
            {events.length === 0 && (
              <div className="bg-white rounded-lg border border-[#e5e5e5] p-12 text-center text-[#999]">
                No race data available for today. Check back later.
              </div>
            )}

            {events.map((event) => {
              const analysis = analysisMap.get(event.id);
              const runners = (event as SportEvent & { runners?: Runner[] }).runners || [];
              const srSelections = sameRaceSelections[event.id] || [];
              const srMultiOdds = getSameRaceMultiOdds(event.id);

              return (
                <div key={event.id} className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
                  {/* Race Header */}
                  <div className="bg-[#003f7f] text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-white/60 uppercase tracking-wide">{event.venue}</div>
                      <div className="font-bold text-sm mt-0.5">{event.event}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end text-xs text-white/60">
                        {new Date(event.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        <CountdownPill startTime={event.startTime} now={now} />
                      </div>
                      {analysis && (
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          analysis.confidenceLevel === 'high'
                            ? 'bg-[#00a651] text-white'
                            : analysis.confidenceLevel === 'medium'
                              ? 'bg-[#f47920] text-white'
                              : 'bg-white/20 text-white/80'
                        }`}>
                          {analysis.agreementCount}/3 {analysis.confidenceLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Model Picks (if analyzed) */}
                  {analysis && (
                    <div className="bg-[#f8fafc] border-b border-[#e5e5e5] px-4 py-3">
                      <div className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-2">AI Picks</div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { model: 'claude' as const, pick: analysis.claudePick, label: 'Claude' },
                          { model: 'gpt' as const, pick: analysis.gptPick, label: 'GPT-4o' },
                          { model: 'gemini' as const, pick: analysis.geminiPick, label: 'Gemini' },
                        ].map(({ model, pick, label }) => (
                          <div key={model} className={`rounded-lg p-2.5 border ${
                            pick.pick === analysis.consensusPick
                              ? 'border-[#00a651] bg-[#00a651]/5'
                              : 'border-[#e5e5e5] bg-white'
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <ModelIcon model={model} agrees={pick.pick === analysis.consensusPick} size="sm" />
                              <span className="text-[10px] font-bold text-[#666]">{label}</span>
                            </div>
                            <div className="text-[12px] font-bold text-[#333] truncate">{pick.pick}</div>
                            <div className="text-[10px] text-[#999] mt-0.5">{pick.confidence}/10 conf</div>
                            <p className="text-[10px] text-[#666] mt-1 leading-relaxed line-clamp-2">{pick.reasoning}</p>
                          </div>
                        ))}
                      </div>
                      {analysis.consensusPick && (
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          <span className="text-[#00a651] font-bold">Consensus:</span>
                          <span className="font-bold text-[#333]">{analysis.consensusPick}</span>
                          <span className="text-[#999]">@ ${(event.odds[analysis.consensusPick] || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Runners Grid */}
                  <div className="divide-y divide-[#f0f0f0]">
                    {runners.length > 0 ? runners.map((runner) => {
                      const isConsensus = analysis?.consensusPick === runner.name;
                      const isSrSelected = srSelections.includes(runner.name);

                      return (
                        <div key={runner.number} className={`px-4 py-2.5 flex items-center gap-3 hover:bg-[#f9f9f9] transition-colors ${isConsensus ? 'bg-[#00a651]/5' : ''}`}>
                          <div className="w-6 h-6 rounded-full bg-[#003f7f] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {runner.number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[13px] font-semibold ${isConsensus ? 'text-[#00a651]' : 'text-[#333]'}`}>
                                {runner.name}
                              </span>
                              {isConsensus && <span className="text-[9px] bg-[#00a651] text-white px-1.5 py-0.5 rounded font-bold">PICK</span>}
                              <span className="text-[10px] text-[#999]">(B{runner.barrier})</span>
                            </div>
                            <div className="text-[10px] text-[#666] mt-0.5">
                              J: {runner.jockey || 'N/A'} &middot; T: {runner.trainer || 'N/A'} &middot; {runner.weight}kg
                              {runner.form && <> &middot; L10: {runner.form}</>}
                              {runner.career && <> &middot; C: {runner.career}</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Odds button */}
                            <button
                              onClick={() => toggleSameRacePick(event.id, runner.name)}
                              className={`text-[13px] font-bold px-3 py-1.5 rounded transition-all min-w-[56px] ${
                                isSrSelected
                                  ? 'bg-[#00a651] text-white shadow-sm'
                                  : 'bg-[#f5f5f5] text-[#333] border border-[#ddd] hover:border-[#f47920] hover:text-[#f47920]'
                              }`}
                            >
                              ${runner.winOdds.toFixed(2)}
                            </button>
                          </div>
                        </div>
                      );
                    }) : Object.entries(event.odds).map(([name, odds]) => {
                      const isConsensus = analysis?.consensusPick === name;
                      const isSrSelected = srSelections.includes(name);

                      return (
                        <div key={name} className={`px-4 py-2.5 flex items-center justify-between hover:bg-[#f9f9f9] ${isConsensus ? 'bg-[#00a651]/5' : ''}`}>
                          <span className={`text-[13px] font-semibold ${isConsensus ? 'text-[#00a651]' : 'text-[#333]'}`}>
                            {name}
                            {isConsensus && <span className="ml-2 text-[9px] bg-[#00a651] text-white px-1.5 py-0.5 rounded font-bold">PICK</span>}
                          </span>
                          <button
                            onClick={() => toggleSameRacePick(event.id, name)}
                            className={`text-[13px] font-bold px-3 py-1.5 rounded transition-all min-w-[56px] ${
                              isSrSelected
                                ? 'bg-[#00a651] text-white shadow-sm'
                                : 'bg-[#f5f5f5] text-[#333] border border-[#ddd] hover:border-[#f47920] hover:text-[#f47920]'
                            }`}
                          >
                            ${odds.toFixed(2)}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI SRM Suggestion */}
                  {analysis && !srmSuggestions[event.id] && (
                    <div className="bg-[#f8fafc] border-t border-[#e5e5e5] px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-[#333]">AI Same Race Multi</div>
                        <div className="text-[10px] text-[#666]">Get AI-suggested SRM picks for this race</div>
                      </div>
                      <button
                        onClick={() => fetchSrm(event)}
                        disabled={srmLoading[event.id]}
                        className="bg-[#f47920] hover:bg-[#e06810] disabled:opacity-50 text-white font-bold px-4 py-2 rounded text-[11px] transition-colors"
                      >
                        {srmLoading[event.id] ? 'Generating...' : 'Get AI SRM'}
                      </button>
                    </div>
                  )}

                  {srmSuggestions[event.id] && (
                    <div className="bg-gradient-to-r from-[#f47920]/10 to-[#f47920]/5 border-t border-[#f47920]/20 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-[#f47920] uppercase tracking-wider">AI Same Race Multi</span>
                        <span className="text-[10px] font-bold bg-[#f47920] text-white px-1.5 py-0.5 rounded">
                          {srmSuggestions[event.id].confidence}/10
                        </span>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        {srmSuggestions[event.id].picks.map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-[#f47920] mt-0.5">{i + 1}.</span>
                            <div>
                              <span className="text-[12px] font-bold text-[#333]">{p.name}</span>
                              <span className="text-[10px] text-[#666] ml-2">{p.reasoning}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#666] italic">{srmSuggestions[event.id].summary}</p>
                    </div>
                  )}

                  {/* Same Race Multi Footer */}
                  {srSelections.length >= 2 && (
                    <div className="bg-[#003f7f] text-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-white/60 uppercase tracking-wider">Same Race Multi</div>
                        <div className="text-[12px] mt-0.5">{srSelections.join(' + ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-white/60">Combined Odds</div>
                        <div className="text-lg font-bold text-[#f47920]">${srMultiOdds.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar - Daily Multi Builder */}
          <div className="space-y-4">
            {/* AI Daily Multi (auto-built from consensus) */}
            {dailyMultiLegs.length > 0 && (
              <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden sticky top-20">
                <div className="bg-gradient-to-r from-[#f47920] to-[#e06810] text-white px-4 py-3">
                  <div className="text-xs text-white/80 uppercase tracking-wider">AI Consensus</div>
                  <div className="text-lg font-bold">Daily Multi</div>
                </div>

                <div className="divide-y divide-[#f0f0f0]">
                  {dailyMultiLegs.map((leg) => (
                    <div key={leg.eventId} className="px-4 py-3">
                      <div className="text-[10px] text-[#999] uppercase">{leg.venue}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-[12px] font-bold text-[#333]">{leg.pick}</div>
                          <div className="text-[10px] text-[#666] mt-0.5 truncate max-w-[180px]">{leg.event}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[13px] font-bold text-[#f47920]">${leg.odds.toFixed(2)}</div>
                          <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                            leg.agreement === 3
                              ? 'bg-[#00a651]/10 text-[#00a651]'
                              : 'bg-[#f47920]/10 text-[#f47920]'
                          }`}>
                            {leg.agreement}/3
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#003f7f] text-white px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{dailyMultiLegs.length} legs</span>
                    <div>
                      <div className="text-[10px] text-white/60 uppercase">Combined Odds</div>
                      <div className="text-2xl font-bold text-[#f47920]">${dailyMultiOdds.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/50 text-center mt-1">
                    $10 stake returns ${(dailyMultiOdds * 10).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Multi Builder */}
            {Object.keys(dailyMultiSelections).length > 0 && (
              <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
                <div className="bg-[#00a651] text-white px-4 py-3">
                  <div className="text-xs text-white/80 uppercase tracking-wider">Your Picks</div>
                  <div className="text-lg font-bold">Custom Multi</div>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  {Object.entries(dailyMultiSelections).map(([eventId, pick]) => {
                    const event = events.find(e => e.id === eventId);
                    if (!event) return null;
                    return (
                      <div key={eventId} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[12px] font-bold text-[#333]">{pick}</div>
                          <div className="text-[10px] text-[#666]">{event.venue}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#f47920]">${(event.odds[pick] || 0).toFixed(2)}</span>
                          <button
                            onClick={() => toggleDailyMultiPick(eventId, pick)}
                            className="text-[#999] hover:text-[#d32f2f] text-xs"
                          >
                            x
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-[#f9f9f9] px-4 py-3 text-right border-t border-[#e5e5e5]">
                  <div className="text-[10px] text-[#666] uppercase">Combined Odds</div>
                  <div className="text-xl font-bold text-[#00a651]">${customDailyMultiOdds.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Quick Add to Daily Multi from races */}
            {hasAnalysis && (
              <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e5e5e5]">
                  <div className="text-[12px] font-bold text-[#333]">Build Your Multi</div>
                  <div className="text-[10px] text-[#666] mt-0.5">Tap a pick to add to your daily multi</div>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  {liveAnalyzed.map((a) => {
                    const isSelected = dailyMultiSelections[a.event.id] === a.consensusPick;
                    return (
                      <button
                        key={a.event.id}
                        onClick={() => {
                          if (a.consensusPick) toggleDailyMultiPick(a.event.id, a.consensusPick);
                        }}
                        disabled={!a.consensusPick}
                        className={`w-full px-4 py-2.5 text-left hover:bg-[#f9f9f9] transition-colors disabled:opacity-40 ${
                          isSelected ? 'bg-[#00a651]/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-[#999]">{a.event.venue}</div>
                            <div className="text-[12px] font-semibold text-[#333] flex items-center gap-1.5">
                              {a.consensusPick || 'Split'}
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                a.agreementCount === 3 ? 'bg-[#00a651]/10 text-[#00a651]' : 'bg-[#f47920]/10 text-[#f47920]'
                              }`}>
                                {a.agreementCount}/3
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#f47920]">
                              ${a.consensusPick ? (a.event.odds[a.consensusPick] || 0).toFixed(2) : '-'}
                            </span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-[#00a651] text-white text-[10px] flex items-center justify-center">&#10003;</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No analysis state */}
            {!hasAnalysis && events.length > 0 && (
              <div className="bg-white rounded-lg border border-[#e5e5e5] p-6 text-center">
                <div className="text-3xl mb-3">&#129302;</div>
                <div className="text-[13px] font-bold text-[#333] mb-1">AI Analysis Not Run</div>
                <p className="text-[11px] text-[#666] mb-4">
                  Click &quot;Run AI Analysis&quot; to get picks from Claude, GPT-4o, and Gemini.
                </p>
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="bg-[#f47920] hover:bg-[#e06810] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
                >
                  {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
