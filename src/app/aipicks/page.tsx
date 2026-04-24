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
    const events: SportEvent[] = data?.events || [];

    // Check if races are stale (all start times have passed by more than 1 hour)
    if (events.length > 0) {
      const now = Date.now();
      const latestRace = Math.max(...events.map(e => new Date(e.startTime).getTime()));
      const oneHour = 60 * 60 * 1000;
      if (latestRace + oneHour < now) {
        // All races are old, return empty to trigger fresh display
        return [];
      }
    }

    return events;
  } catch {
    return [];
  }
}

export default async function AiPicksPage() {
  let events = await getRaceData();

  // If no events or stale, trigger a fresh scrape
  if (events.length === 0) {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/scrape`, { cache: 'no-store' });
      const data = await res.json();
      events = data?.events || [];
    } catch {
      // Fall through with empty events
    }
  }

  const cachedAnalysis = await getTodayAnalysis().catch(() => null);
  const analyzed: AnalyzedEvent[] = cachedAnalysis?.analyzed || [];

  return <AiPicksClient events={events} analyzed={analyzed} />;
}
