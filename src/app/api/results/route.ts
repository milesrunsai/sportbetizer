import { NextResponse } from 'next/server';
import { getResults, saveResults, getBankroll, saveBankroll } from '@/lib/db';
import type { ResultEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = await getResults();
  return NextResponse.json({ results });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (secret !== 'miles-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: ResultEntry = await request.json();
  const results = await getResults();
  const bankroll = await getBankroll();

  // Update bankroll
  const change = body.result === 'won' ? body.returnAmount - body.stake : -body.stake;
  bankroll.currentBalance = Math.round((bankroll.currentBalance + change) * 100) / 100;
  bankroll.history.push({
    date: body.date,
    balance: bankroll.currentBalance,
    change,
    reason: body.result === 'won'
      ? `Daily multi won - ${body.combinedOdds.toFixed(2)}x return`
      : `Daily multi lost - ${body.legs.length} leg multi`,
  });

  results.push(body);

  await saveResults(results);
  await saveBankroll(bankroll);

  return NextResponse.json({
    success: true,
    bankroll: bankroll.currentBalance,
    change,
  });
}
