import { neon } from '@neondatabase/serverless';
import type { BankrollData, ResultEntry } from './types';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

export async function getBankroll(): Promise<BankrollData> {
  const sql = getDb();
  const [bankroll] = await sql`SELECT starting_balance, current_balance FROM bankroll LIMIT 1`;
  const history = await sql`SELECT date, balance, change, reason FROM bankroll_history ORDER BY date ASC`;
  
  return {
    startingBalance: parseFloat(bankroll?.starting_balance ?? '100'),
    currentBalance: parseFloat(bankroll?.current_balance ?? '100'),
    history: history.map(h => ({
      date: new Date(h.date).toISOString().split('T')[0],
      balance: parseFloat(h.balance),
      change: parseFloat(h.change),
      reason: h.reason,
    })),
  };
}

export async function saveBankroll(data: BankrollData): Promise<void> {
  const sql = getDb();
  await sql`UPDATE bankroll SET current_balance = ${data.currentBalance}, updated_at = NOW()`;
  // Clear and re-insert history
  await sql`DELETE FROM bankroll_history`;
  for (const h of data.history) {
    await sql`INSERT INTO bankroll_history (date, balance, change, reason) VALUES (${h.date}, ${h.balance}, ${h.change}, ${h.reason})`;
  }
}

export async function getResults(): Promise<ResultEntry[]> {
  const sql = getDb();
  const results = await sql`SELECT * FROM results ORDER BY date DESC`;
  const allLegs = await sql`SELECT * FROM result_legs ORDER BY leg_order ASC`;
  
  return results.map(r => ({
    id: r.id,
    date: new Date(r.date).toISOString().split('T')[0],
    legs: allLegs
      .filter(l => l.result_id === r.id)
      .map(l => ({
        event: l.event,
        pick: l.pick,
        odds: parseFloat(l.odds),
        result: l.result as 'won' | 'lost',
      })),
    combinedOdds: parseFloat(r.combined_odds),
    stake: parseFloat(r.stake),
    result: r.result as 'won' | 'lost',
    returnAmount: parseFloat(r.return_amount),
    bankrollAfter: parseFloat(r.bankroll_after),
  }));
}

export async function saveResults(data: ResultEntry[]): Promise<void> {
  const sql = getDb();
  // Clear and re-insert
  await sql`DELETE FROM result_legs`;
  await sql`DELETE FROM results`;
  for (const r of data) {
    await sql`INSERT INTO results (id, date, combined_odds, stake, result, return_amount, bankroll_after) VALUES (${r.id}, ${r.date}, ${r.combinedOdds}, ${r.stake}, ${r.result}, ${r.returnAmount}, ${r.bankrollAfter})`;
    for (let i = 0; i < r.legs.length; i++) {
      const leg = r.legs[i];
      await sql`INSERT INTO result_legs (result_id, event, pick, odds, result, leg_order) VALUES (${r.id}, ${leg.event}, ${leg.pick}, ${leg.odds}, ${leg.result}, ${i})`;
    }
  }
}

export async function getTodayAnalysis() {
  const sql = getDb();
  const today = new Date().toISOString().split('T')[0];
  const rows = await sql`SELECT data FROM today_analysis WHERE date = ${today} LIMIT 1`;
  return rows.length > 0 ? rows[0].data : null;
}

export async function saveTodayAnalysis(data: unknown): Promise<void> {
  const sql = getDb();
  const today = new Date().toISOString().split('T')[0];
  await sql`INSERT INTO today_analysis (date, data) VALUES (${today}, ${JSON.stringify(data)}) ON CONFLICT (date) DO UPDATE SET data = ${JSON.stringify(data)}`;
}
