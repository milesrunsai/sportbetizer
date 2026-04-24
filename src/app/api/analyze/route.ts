import { promises as fs } from 'fs';
import path from 'path';
import type { SportEvent, AnalyzedEvent } from '@/lib/types';
import { saveTodayAnalysis } from '@/lib/db';
import { enrichRaceWithRacenet } from '@/lib/racenet';
import { analyzeEventWithAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    // Try loading cached file
    try {
      const raw = await fs.readFile(
        path.join(process.cwd(), 'data', 'today-races.json'),
        'utf-8'
      );
      events = JSON.parse(raw).events;
    } catch {
      return Response.json(
        { error: 'No race data available. Run /api/scrape first.' },
        { status: 500 }
      );
    }
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

  // Enrich horse/greyhound races with Racenet profile data before LLM analysis
  for (let i = 0; i < events.length; i++) {
    const ev = events[i] as SportEvent & { runners?: Array<{ name: string; [key: string]: unknown }> };
    if (ev.runners && ev.runners.length > 0 && (ev.sport === 'Horse Racing' || ev.sport === 'Greyhounds')) {
      try {
        const enriched = await enrichRaceWithRacenet(ev.runners);
        (events[i] as unknown as Record<string, unknown>).runners = enriched;
      } catch {
        // Non-critical — continue with unenriched data
      }
    }
  }

  // Analyze races in batches of 3 to avoid rate limits
  const batchSize = 3;
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
