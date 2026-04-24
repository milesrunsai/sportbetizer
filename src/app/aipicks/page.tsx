import { neon } from '@neondatabase/serverless';
import { getTodayAnalysis } from '@/lib/db';
import type { SportEvent, AnalyzedEvent } from '@/lib/types';
import AiPicksClient from './AiPicksClient';

export const dynamic = 'force-dynamic';

async function getRaceData(): Promise<SportEvent[]> {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const sql = neon(url);
    const today = new Date().toISOString().split('T')[0];
    const rows = await sql`SELECT data FROM races WHERE race_date = ${today} LIMIT 1`;
    if (rows.length === 0) return [];
    const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    return data?.events || [];
  } catch {
    return [];
  }
}

export default async function AiPicksPage() {
  const [events, cachedAnalysis] = await Promise.all([
    getRaceData(),
    getTodayAnalysis().catch(() => null),
  ]);

  const analyzed: AnalyzedEvent[] = cachedAnalysis?.analyzed || [];

  return <AiPicksClient events={events} analyzed={analyzed} />;
}
