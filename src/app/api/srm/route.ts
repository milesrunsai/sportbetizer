import type { SportEvent } from '@/lib/types';
import { formatRaceForPrompt, callOpenAI, callAnthropic, callGemini } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SRM_PROMPT = (raceData: string) =>
  `You are an expert horse racing form analyst. Suggest a Same Race Multi for this race - pick 2-3 runners most likely to finish in the top 3 positions.

${raceData}

Reply ONLY with valid JSON:
{
  "picks": [
    {"name": "exact runner name", "reasoning": "why this runner will place top 3"}
  ],
  "confidence": 7,
  "summary": "one sentence explaining why this combination works"
}

confidence is 1-10. Pick names must exactly match runner names from the race data. Pick 2-3 runners.`;

interface SrmPick {
  name: string;
  reasoning: string;
}

interface SrmResult {
  picks: SrmPick[];
  confidence: number;
  summary: string;
}

function parseSrmResponse(raw: string, validNames: string[]): SrmResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.picks) || parsed.picks.length < 2) return null;

    const picks: SrmPick[] = [];
    for (const p of parsed.picks) {
      const name = String(p.name || '').trim();
      const reasoning = String(p.reasoning || '').trim();
      const matched = validNames.find(
        (n) => n.toLowerCase() === name.toLowerCase()
      ) || validNames.find(
        (n) => n.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(n.toLowerCase())
      );
      if (matched && reasoning) {
        picks.push({ name: matched, reasoning });
      }
    }

    if (picks.length < 2) return null;

    return {
      picks: picks.slice(0, 3),
      confidence: Math.max(1, Math.min(10, Number(parsed.confidence) || 5)),
      summary: String(parsed.summary || '').trim() || 'AI-generated Same Race Multi suggestion.',
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event: SportEvent = body.event;

    if (!event || !event.teams || event.teams.length < 3) {
      return Response.json({ error: 'Invalid event data' }, { status: 400 });
    }

    const raceData = formatRaceForPrompt(event);
    const prompt = SRM_PROMPT(raceData);
    const validNames = event.teams;

    const [openaiRaw, anthropicRaw, geminiRaw] = await Promise.all([
      callOpenAI(prompt).catch(() => ''),
      callAnthropic(prompt).catch(() => ''),
      callGemini(prompt).catch(() => ''),
    ]);

    const results = [
      parseSrmResponse(anthropicRaw, validNames),
      parseSrmResponse(openaiRaw, validNames),
      parseSrmResponse(geminiRaw, validNames),
    ].filter((r): r is SrmResult => r !== null);

    if (results.length === 0) {
      return Response.json({ error: 'No valid SRM suggestions generated' }, { status: 500 });
    }

    // Merge: count how many times each runner appears across models
    const runnerVotes: Record<string, { count: number; reasonings: string[] }> = {};
    for (const result of results) {
      for (const pick of result.picks) {
        if (!runnerVotes[pick.name]) {
          runnerVotes[pick.name] = { count: 0, reasonings: [] };
        }
        runnerVotes[pick.name].count++;
        runnerVotes[pick.name].reasonings.push(pick.reasoning);
      }
    }

    // Sort by vote count, take top 2-3
    const sorted = Object.entries(runnerVotes)
      .sort(([, a], [, b]) => b.count - a.count);

    const topPicks: SrmPick[] = sorted.slice(0, 3).map(([name, data]) => ({
      name,
      reasoning: data.reasonings[0],
    }));

    // Average confidence
    const avgConfidence = Math.round(
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    );

    // Use the best summary
    const bestResult = results.sort((a, b) => b.confidence - a.confidence)[0];

    const suggestion: SrmResult = {
      picks: topPicks,
      confidence: avgConfidence,
      summary: bestResult.summary,
    };

    return Response.json({ suggestion });
  } catch {
    return Response.json({ error: 'Failed to generate SRM' }, { status: 500 });
  }
}
