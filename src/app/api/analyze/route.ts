import { NextResponse } from 'next/server';
import type { SportEvent, AnalyzedEvent, ModelPick } from '@/lib/types';

// TODO: Replace mock with real LLM API calls
// Real implementation would:
// 1. Fetch events from /api/scrape
// 2. Send each event to Claude (ANTHROPIC_API_KEY), GPT (OPENAI_API_KEY), Gemini (GOOGLE_API_KEY)
// 3. Parse responses and build consensus
//
// Example prompt for each model:
// "You are a sports betting analyst. Given this event and odds, pick the most likely winner.
//  Event: {event.event}, Sport: {event.sport}, Odds: {JSON.stringify(event.odds)}
//  Respond with: { pick: string, reasoning: string (2-3 sentences), confidence: number (1-10) }"

function mockClaudePick(event: SportEvent): ModelPick {
  const teams = Object.keys(event.odds);
  const oddsEntries = Object.entries(event.odds);
  // Claude: analytical, picks favourites with probability analysis
  const fav = oddsEntries.reduce((a, b) => (a[1] < b[1] ? a : b));
  const impliedProb = (1 / fav[1] * 100).toFixed(1);

  const reasonings: Record<string, string> = {
    AFL: `Based on probability analysis, ${fav[0]} has an implied probability of ${impliedProb}% at these odds. Their recent form and home advantage suggest this is undervalued by the market.`,
    NRL: `${fav[0]} shows a ${impliedProb}% implied probability. Analysing their completion rate and defensive metrics this season, they present the strongest value proposition.`,
    NBA: `At ${impliedProb}% implied probability, ${fav[0]} represents the statistically optimal selection. Their offensive rating and net rating differential supports this assessment.`,
    UFC: `${fav[0]} at ${impliedProb}% implied probability aligns with striking differential and takedown defence metrics. The stylistic matchup favours them significantly.`,
    'Horse Racing': `${fav[0]} at ${fav[1].toFixed(2)} represents value based on barrier position, track condition suitability, and jockey/trainer combination statistics.`,
    Greyhounds: `${fav[0]} has the best box draw advantage and recent split times suggest they'll lead early. ${impliedProb}% implied probability is fair.`,
    Soccer: `${fav[0]} at ${impliedProb}% implied probability is supported by expected goals (xG) data and defensive solidity metrics this season.`,
  };

  return {
    pick: fav[0],
    reasoning: reasonings[event.sport] || `${fav[0]} at ${impliedProb}% implied probability represents the strongest analytical pick based on available data.`,
    confidence: Math.min(9, Math.round(7 + (1 / fav[1]) * 3)),
  };
}

function mockGptPick(event: SportEvent): ModelPick {
  const oddsEntries = Object.entries(event.odds);
  // GPT: stats-heavy, sometimes contrarian
  const sorted = [...oddsEntries].sort((a, b) => a[1] - b[1]);
  // GPT agrees with favourite 75% of the time
  const pickIdx = Math.random() > 0.25 ? 0 : Math.min(1, sorted.length - 1);
  const pick = sorted[pickIdx];

  const reasonings: Record<string, string> = {
    AFL: `Historical data shows ${pick[0]} winning 62% of similar matchups over the last 3 seasons. Their disposal efficiency of 78.3% this year ranks top 4 in the league.`,
    NRL: `${pick[0]}'s run metres per game (1,850) and tackle efficiency (91.2%) put them in an elite tier. Head-to-head record of 7-3 in last 10 meetings confirms the edge.`,
    NBA: `${pick[0]} has a 71.4% win rate as favourites this season with a +6.2 average margin. Their pace-adjusted offensive rating of 118.4 is top 5 in the league.`,
    UFC: `${pick[0]} has a 78% finish rate with 3.45 significant strikes landed per minute. Tale of the tape shows clear advantages in reach and cardio output.`,
    'Horse Racing': `${pick[0]} has won 3 of last 5 starts on similar track conditions. Weight-for-age form suggests a peak performance is due at this distance.`,
    Greyhounds: `${pick[0]} has posted the fastest 3 split times at this distance over the last month. Win rate from this box position is 34% historically.`,
    Soccer: `${pick[0]} averages 1.8 xG per match with 64% possession in recent fixtures. Their defensive record of 0.7 goals conceded per game is league-best.`,
  };

  return {
    pick: pick[0],
    reasoning: reasonings[event.sport] || `Statistical modelling gives ${pick[0]} a ${(1 / pick[1] * 100).toFixed(0)}% chance based on recent form, historical matchup data, and performance metrics.`,
    confidence: Math.min(9, Math.round(6 + (1 / pick[1]) * 3)),
  };
}

function mockGeminiPick(event: SportEvent): ModelPick {
  const oddsEntries = Object.entries(event.odds);
  // Gemini: trend-focused, momentum-based
  const sorted = [...oddsEntries].sort((a, b) => a[1] - b[1]);
  // Gemini agrees with favourite 70% of the time
  const pickIdx = Math.random() > 0.30 ? 0 : Math.min(1, sorted.length - 1);
  const pick = sorted[pickIdx];

  const reasonings: Record<string, string> = {
    AFL: `${pick[0]} are riding a wave of momentum with 3 consecutive wins and improving key performance indicators. The trend trajectory suggests they peak for this matchup.`,
    NRL: `Current form momentum heavily favours ${pick[0]}. Their trajectory since Round 4 shows steady improvement in attacking efficiency and the confidence is building.`,
    NBA: `${pick[0]} are trending upwards with a 7-3 record in their last 10. The momentum shift after their mid-season trade is clearly reflected in their recent court presence.`,
    UFC: `${pick[0]} has shown evolving fight IQ across recent bouts. The momentum from their training camp footage and recent interviews suggests peak readiness for this fight.`,
    'Horse Racing': `${pick[0]} is trending sharply based on improving track work times and recent race pattern analysis. The upward trajectory in their last 3 starts is compelling.`,
    Greyhounds: `${pick[0]} has shown progressive improvement in split times over recent starts. The momentum pattern suggests they're peaking at the right time for this grade.`,
    Soccer: `${pick[0]} riding strong momentum with current form guide showing progressive improvement in chance creation and defensive solidity over the past 5 matches.`,
  };

  return {
    pick: pick[0],
    reasoning: reasonings[event.sport] || `Trend analysis shows ${pick[0]} with strong upward momentum. Recent performance trajectory and form indicators point to a strong showing.`,
    confidence: Math.min(9, Math.round(6 + (1 / pick[1]) * 2.5)),
  };
}

function analyzeEvent(event: SportEvent): AnalyzedEvent {
  const claudePick = mockClaudePick(event);
  const gptPick = mockGptPick(event);
  const geminiPick = mockGeminiPick(event);

  const picks = [claudePick.pick, gptPick.pick, geminiPick.pick];
  const pickCounts: Record<string, number> = {};
  picks.forEach((p) => {
    pickCounts[p] = (pickCounts[p] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(pickCounts));
  const consensusPick = maxCount >= 2 ? Object.entries(pickCounts).find(([, c]) => c === maxCount)![0] : null;

  return {
    event,
    claudePick,
    gptPick,
    geminiPick,
    consensus: maxCount >= 2 ? 'AGREE' : 'SPLIT',
    consensusPick,
    confidenceLevel: maxCount === 3 ? 'high' : maxCount === 2 ? 'medium' : 'low',
    agreementCount: maxCount,
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Fetch events from scrape endpoint
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  let events: SportEvent[];
  try {
    const res = await fetch(`${baseUrl}/api/scrape`, { cache: 'no-store' });
    const data = await res.json();
    events = data.events;
  } catch {
    // Fallback: import mock directly
    const res = await fetch(`${baseUrl}/api/scrape`);
    const data = await res.json();
    events = data.events;
  }

  const analyzed = events.map(analyzeEvent);

  // Sort by confidence
  analyzed.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidenceLevel] - order[b.confidenceLevel];
  });

  return NextResponse.json({
    analyzed,
    count: analyzed.length,
    consensusCount: analyzed.filter((a) => a.consensus === 'AGREE').length,
  });
}
