import type { SportEvent, AnalyzedEvent, ModelPick } from './types';

export interface RacenetProfile {
  totalRuns: number;
  totalWins: number;
  totalSeconds: number;
  totalThirds: number;
  winPercentage: number;
  placePercentage: number;
  totalPrizeMoney: string;
  lastFiveRuns: Array<{
    date: string;
    venue: string;
    distance: string;
    finishPosition: string;
    totalStarters: string;
    jockey: string;
  }>;
  trainer: string;
  trainerLocation: string;
  age: string;
  sex: string;
  colour: string;
}

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

function formatRacenetStats(profile: RacenetProfile): string {
  const lines: string[] = [];
  lines.push(`  Racenet Stats: ${profile.totalRuns} runs, ${profile.totalWins} wins (${profile.winPercentage}%), ${profile.placePercentage}% place rate, ${profile.totalPrizeMoney} prize money`);

  if (profile.lastFiveRuns.length > 0) {
    const runStrs = profile.lastFiveRuns.map(
      (r) => `${r.finishPosition}/${r.totalStarters} at ${r.venue} (${r.distance}m) on ${r.date}`
    );
    lines.push(`  Last ${profile.lastFiveRuns.length} runs: ${runStrs.join('; ')}`);
  }

  const extras: string[] = [];
  if (profile.trainer) extras.push(`Trainer: ${profile.trainer}`);
  if (profile.age) extras.push(`Age: ${profile.age}`);
  if (profile.sex) extras.push(`Sex: ${profile.sex}`);
  if (extras.length > 0) lines.push(`  ${extras.join(' | ')}`);

  return lines.join('\n');
}

export function formatRaceForPrompt(event: SportEvent): string {
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
      racenetProfile?: RacenetProfile;
    }>;
  };

  if (raceEvent.runners && raceEvent.runners.length > 0) {
    const lines = raceEvent.runners.map((r) => {
      let line = `#${r.number} ${r.name} | Jockey: ${r.jockey || 'N/A'} | Trainer: ${r.trainer || 'N/A'} | Barrier: ${r.barrier || 'N/A'} | Weight: ${r.weight ? r.weight + 'kg' : 'N/A'} | Form: ${r.form || 'N/A'} | WIN Odds: $${r.winOdds.toFixed(2)}`;
      if (r.racenetProfile) {
        line += '\n' + formatRacenetStats(r.racenetProfile);
      }
      return line;
    });
    return `Race: ${raceEvent.event}\nVenue: ${raceEvent.venue}\nStart: ${raceEvent.startTime}\n\nRunners:\n${lines.join('\n')}`;
  }

  const oddsLines = Object.entries(event.odds)
    .map(([name, odds]) => `${name}: $${odds.toFixed(2)}`)
    .join('\n');
  return `Race: ${event.event}\nVenue: ${event.venue}\nStart: ${event.startTime}\nSport: ${event.sport}\n\nRunners/Odds:\n${oddsLines}`;
}

export function parsePick(raw: string, validNames: string[]): ModelPick | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    const pick = String(parsed.pick || '').trim();
    const reasoning = String(parsed.reasoning || '').trim();
    const confidence = Math.max(1, Math.min(10, Number(parsed.confidence) || 5));

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

export async function callOpenAI(prompt: string): Promise<string> {
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

export async function callAnthropic(prompt: string): Promise<string> {
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

export async function callGemini(prompt: string): Promise<string> {
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

export async function analyzeEventWithAI(
  event: SportEvent
): Promise<AnalyzedEvent | null> {
  const raceData = formatRaceForPrompt(event);
  const validNames = event.teams;
  const round1Prompt = ROUND1_PROMPT(raceData);

  const [openaiRaw, anthropicRaw, geminiRaw] = await Promise.all([
    callOpenAI(round1Prompt).catch((e) => `ERROR: ${e.message}`),
    callAnthropic(round1Prompt).catch((e) => `ERROR: ${e.message}`),
    callGemini(round1Prompt).catch((e) => `ERROR: ${e.message}`),
  ]);

  const r1Claude = parsePick(anthropicRaw, validNames);
  const r1Gpt = parsePick(openaiRaw, validNames);
  const r1Gemini = parsePick(geminiRaw, validNames);

  const validR1 = [r1Claude, r1Gpt, r1Gemini].filter(Boolean);
  if (validR1.length < 2) return null;

  const r1Picks = validR1.map((p) => p!.pick);
  const allAgreeR1 =
    r1Picks.length === 3 && r1Picks[0] === r1Picks[1] && r1Picks[1] === r1Picks[2];

  let claudePick = r1Claude;
  let gptPick = r1Gpt;
  let geminiPick = r1Gemini;

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
        callAnthropic(DEBATE_PROMPT(raceData, buildOtherPicks('Claude'))).catch(() => '')
      );
    }
    if (r1Gpt) {
      debateModels.push('gpt');
      debatePromises.push(
        callOpenAI(DEBATE_PROMPT(raceData, buildOtherPicks('GPT-4o'))).catch(() => '')
      );
    }
    if (r1Gemini) {
      debateModels.push('gemini');
      debatePromises.push(
        callGemini(DEBATE_PROMPT(raceData, buildOtherPicks('Gemini'))).catch(() => '')
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

  const fallbackPick: ModelPick = {
    pick: validNames[0],
    reasoning: 'Model unavailable — defaulting to market favourite.',
    confidence: 3,
  };

  const finalClaude = claudePick || fallbackPick;
  const finalGpt = gptPick || fallbackPick;
  const finalGemini = geminiPick || fallbackPick;

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
