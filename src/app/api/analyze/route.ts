import { promises as fs } from 'fs';
import path from 'path';
import type { SportEvent, AnalyzedEvent, ModelPick } from '@/lib/types';
import { saveTodayAnalysis } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ROUND1_PROMPT = (raceData: string) =>
  `You are an expert horse racing analyst. Analyze this race and pick the winner. Consider form, barrier, weight, jockey, track, and odds value.

${raceData}

Reply ONLY with valid JSON:
{"pick": "runner name exactly as shown", "reasoning": "2-3 sentences explaining your pick", "confidence": 8}

confidence is 1-10. Pick must be an exact runner name from the race data.`;

const DEBATE_PROMPT = (
  raceData: string,
  otherPicks: { model: string; pick: string; reasoning: string }[]
) =>
  `You are an expert horse racing analyst in a debate. You previously analyzed this race. Now consider the other analysts' picks before making your FINAL decision.

${raceData}

Other analysts picked:
${otherPicks.map((p) => `- ${p.model}: ${p.pick} — "${p.reasoning}"`).join('\n')}

You may change your pick or stick with your original. Reply ONLY with valid JSON:
{"pick": "runner name exactly as shown", "reasoning": "2-3 sentences explaining your final pick after considering the debate", "confidence": 8}

confidence is 1-10. Pick must be an exact runner name from the race data.`;

function formatRaceForPrompt(event: SportEvent): string {
  const raceEvent = event as SportEvent & {
    runners?: Array<{
      name: string;
      number: number;
      jockey: string;
      trainer: string;
      barrier: number;
      weight: number;
      form: string;
      winOdds: number;
    }>;
  };

  if (raceEvent.runners && raceEvent.runners.length > 0) {
    const lines = raceEvent.runners.map(
      (r) =>
        `#${r.number} ${r.name} | Jockey: ${r.jockey || 'N/A'} | Trainer: ${r.trainer || 'N/A'} | Barrier: ${r.barrier || 'N/A'} | Weight: ${r.weight ? r.weight + 'kg' : 'N/A'} | Form: ${r.form || 'N/A'} | WIN Odds: $${r.winOdds.toFixed(2)}`
    );
    return `Race: ${raceEvent.event}\nVenue: ${raceEvent.venue}\nStart: ${raceEvent.startTime}\n\nRunners:\n${lines.join('\n')}`;
  }

  // Fallback for events without detailed runner info
  const oddsLines = Object.entries(event.odds)
    .map(([name, odds]) => `${name}: $${odds.toFixed(2)}`)
    .join('\n');
  return `Race: ${event.event}\nVenue: ${event.venue}\nStart: ${event.startTime}\nSport: ${event.sport}\n\nRunners/Odds:\n${oddsLines}`;
}

function parsePick(raw: string, validNames: string[]): ModelPick | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    const pick = String(parsed.pick || '').trim();
    const reasoning = String(parsed.reasoning || '').trim();
    const confidence = Math.max(1, Math.min(10, Number(parsed.confidence) || 5));

    // Fuzzy match pick to valid names
    const exactMatch = validNames.find(
      (n) => n.toLowerCase() === pick.toLowerCase()
    );
    const partialMatch = validNames.find(
      (n) =>
        n.toLowerCase().includes(pick.toLowerCase()) ||
        pick.toLowerCase().includes(n.toLowerCase())
    );
    const matchedPick = exactMatch || partialMatch;

    if (!matchedPick || !reasoning) return null;

    return { pick: matchedPick, reasoning, confidence };
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function analyzeEventWithAI(
  event: SportEvent
): Promise<AnalyzedEvent | null> {
  const raceData = formatRaceForPrompt(event);
  const validNames = event.teams;
  const round1Prompt = ROUND1_PROMPT(raceData);

  // ROUND 1: All 3 models analyze independently in parallel
  const [openaiRaw, anthropicRaw, geminiRaw] = await Promise.all([
    callOpenAI(round1Prompt).catch((e) => `ERROR: ${e.message}`),
    callAnthropic(round1Prompt).catch((e) => `ERROR: ${e.message}`),
    callGemini(round1Prompt).catch((e) => `ERROR: ${e.message}`),
  ]);

  const r1Claude = parsePick(anthropicRaw, validNames);
  const r1Gpt = parsePick(openaiRaw, validNames);
  const r1Gemini = parsePick(geminiRaw, validNames);

  // Count how many models returned valid picks
  const validR1 = [r1Claude, r1Gpt, r1Gemini].filter(Boolean);
  if (validR1.length < 2) {
    // Not enough models responded — skip this race
    return null;
  }

  // Check if all agree in Round 1 (no debate needed)
  const r1Picks = validR1.map((p) => p!.pick);
  const allAgreeR1 =
    r1Picks.length === 3 && r1Picks[0] === r1Picks[1] && r1Picks[1] === r1Picks[2];

  let claudePick = r1Claude;
  let gptPick = r1Gpt;
  let geminiPick = r1Gemini;

  // ROUND 2 (DEBATE): Only if picks differ
  if (!allAgreeR1) {
    const buildOtherPicks = (
      excludeModel: string
    ): { model: string; pick: string; reasoning: string }[] => {
      const others: { model: string; pick: ModelPick | null }[] = [
        { model: 'GPT-4o', pick: r1Gpt },
        { model: 'Claude', pick: r1Claude },
        { model: 'Gemini', pick: r1Gemini },
      ].filter((o) => o.model !== excludeModel && o.pick);
      return others.map((o) => ({
        model: o.model,
        pick: o.pick!.pick,
        reasoning: o.pick!.reasoning,
      }));
    };

    const debatePromises: Promise<string>[] = [];
    const debateModels: ('claude' | 'gpt' | 'gemini')[] = [];

    if (r1Claude) {
      debateModels.push('claude');
      debatePromises.push(
        callAnthropic(DEBATE_PROMPT(raceData, buildOtherPicks('Claude'))).catch(
          () => ''
        )
      );
    }
    if (r1Gpt) {
      debateModels.push('gpt');
      debatePromises.push(
        callOpenAI(DEBATE_PROMPT(raceData, buildOtherPicks('GPT-4o'))).catch(
          () => ''
        )
      );
    }
    if (r1Gemini) {
      debateModels.push('gemini');
      debatePromises.push(
        callGemini(DEBATE_PROMPT(raceData, buildOtherPicks('Gemini'))).catch(
          () => ''
        )
      );
    }

    const debateResults = await Promise.all(debatePromises);

    for (let i = 0; i < debateModels.length; i++) {
      const parsed = parsePick(debateResults[i], validNames);
      if (!parsed) continue;
      if (debateModels[i] === 'claude') claudePick = parsed;
      if (debateModels[i] === 'gpt') gptPick = parsed;
      if (debateModels[i] === 'gemini') geminiPick = parsed;
    }
  }

  // Use fallback picks for any model that failed
  const fallbackPick: ModelPick = {
    pick: validNames[0],
    reasoning: 'Model unavailable — defaulting to market favourite.',
    confidence: 3,
  };

  const finalClaude = claudePick || fallbackPick;
  const finalGpt = gptPick || fallbackPick;
  const finalGemini = geminiPick || fallbackPick;

  // Build consensus
  const picks = [finalClaude.pick, finalGpt.pick, finalGemini.pick];
  const pickCounts: Record<string, number> = {};
  picks.forEach((p) => {
    pickCounts[p] = (pickCounts[p] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(pickCounts));
  const consensusPick =
    maxCount >= 2
      ? Object.entries(pickCounts).find(([, c]) => c === maxCount)![0]
      : null;

  return {
    event,
    claudePick: finalClaude,
    gptPick: finalGpt,
    geminiPick: finalGemini,
    consensus: maxCount >= 2 ? 'AGREE' : 'SPLIT',
    consensusPick,
    confidenceLevel:
      maxCount === 3 ? 'high' : maxCount === 2 ? 'medium' : 'low',
    agreementCount: maxCount,
  };
}

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

  let analyzed: AnalyzedEvent[];

  if (!hasKeys) {
    // No API keys — return error telling user to configure them
    return Response.json(
      {
        error:
          'No AI API keys configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, and GOOGLE_API_KEY in your .env file.',
      },
      { status: 500 }
    );
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

  analyzed = results.filter((r): r is AnalyzedEvent => r !== null);

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
