import { NextResponse } from 'next/server';
import type { AnalyzedEvent, MultiLeg, DailyMulti } from '@/lib/types';
import { getBankroll } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Get analyzed events
  const analysisRes = await fetch(`${baseUrl}/api/analyze`, { cache: 'no-store' });
  const { analyzed }: { analyzed: AnalyzedEvent[] } = await analysisRes.json();

  // Get current bankroll
  const bankroll = await getBankroll();

  // Filter to consensus picks only (2/3 or 3/3 agree)
  const consensusPicks = analyzed.filter((a) => a.consensus === 'AGREE' && a.consensusPick);

  // Sort by confidence (3/3 first, then by individual confidence scores)
  consensusPicks.sort((a, b) => {
    if (a.agreementCount !== b.agreementCount) return b.agreementCount - a.agreementCount;
    const aConf = (a.claudePick.confidence + a.gptPick.confidence + a.geminiPick.confidence) / 3;
    const bConf = (b.claudePick.confidence + b.gptPick.confidence + b.geminiPick.confidence) / 3;
    return bConf - aConf;
  });

  // Take top 4-6 picks
  const topPicks = consensusPicks.slice(0, Math.min(6, Math.max(4, consensusPicks.length)));

  // Build multi legs
  const legs: MultiLeg[] = topPicks.map((pick) => {
    const pickOdds = pick.event.odds[pick.consensusPick!] || 1.5;
    return {
      event: pick.event,
      pick: pick.consensusPick!,
      odds: pickOdds,
      claudeAgrees: pick.claudePick.pick === pick.consensusPick,
      gptAgrees: pick.gptPick.pick === pick.consensusPick,
      geminiAgrees: pick.geminiPick.pick === pick.consensusPick,
      confidenceLevel: pick.confidenceLevel as 'high' | 'medium',
    };
  });

  // Calculate combined odds
  const combinedOdds = legs.reduce((acc, leg) => acc * leg.odds, 1);

  // Determine stake: 5% for mostly 3/3, 2% for mostly 2/3
  const highConfCount = legs.filter((l) => l.confidenceLevel === 'high').length;
  const stakePercent = highConfCount > legs.length / 2 ? 0.05 : 0.02;
  const recommendedStake = Math.round(bankroll.currentBalance * stakePercent * 100) / 100;

  const today = new Date().toISOString().split('T')[0];

  const multi: DailyMulti = {
    id: `multi-${today}`,
    date: today,
    legs,
    combinedOdds: Math.round(combinedOdds * 100) / 100,
    recommendedStake,
    result: 'pending',
  };

  return NextResponse.json({
    multi,
    bankroll: bankroll.currentBalance,
    potentialReturn: Math.round(combinedOdds * recommendedStake * 100) / 100,
  });
}
