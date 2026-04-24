import { neon } from '@neondatabase/serverless';
import type { SportEvent, AnalyzedEvent } from '@/lib/types';
import { saveTodayAnalysis } from '@/lib/db';
import { analyzeEventWithAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  // Read race data from DB
  let events: SportEvent[] = [];
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return Response.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }
  try {
    const sql = neon(dbUrl);
    const today = new Date().toISOString().split('T')[0];
    const rows = await sql`SELECT data FROM races WHERE race_date = ${today} LIMIT 1`;
    if (rows.length > 0) {
      const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      events = data?.events || [];
    }
  } catch {
    return Response.json({ error: 'Failed to read race data from DB' }, { status: 500 });
  }

  if (events.length === 0) {
    return Response.json({ error: 'No race data available.' }, { status: 500 });
  }

  // Check if any API keys are configured
  const hasKeys =
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!hasKeys) {
    return Response.json(
      {
        error:
          'No AI API keys configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and GOOGLE_API_KEY in your .env file.',
      },
      { status: 500 }
    );
  }

  // Analyze races in batches of 2 to stay within timeout
  const batchSize = 2;
  const results: (AnalyzedEvent | null)[] = [];

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((event) =>
        analyzeEventWithAI(event).catch(() => null)
      )
    );
    results.push(...batchResults);
  }

  const analyzed = results.filter((r): r is AnalyzedEvent => r !== null);

  // Sort by confidence
  analyzed.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidenceLevel] - order[b.confidenceLevel];
  });

  const response = {
    analyzed,
    count: analyzed.length,
    consensusCount: analyzed.filter((a) => a.consensus === 'AGREE').length,
  };

  // Cache analysis
  try {
    await saveTodayAnalysis(response);
  } catch {
    // Non-critical
  }

  return Response.json(response, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}
