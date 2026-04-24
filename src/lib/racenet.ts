const RACENET_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

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

const profileCache = new Map<string, RacenetProfile | null>();

function toSlug(horseName: string): string {
  return horseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-aus';
}

function extractBetween(html: string, before: string, after: string): string {
  const startIdx = html.indexOf(before);
  if (startIdx === -1) return '';
  const contentStart = startIdx + before.length;
  const endIdx = html.indexOf(after, contentStart);
  if (endIdx === -1) return '';
  return html.substring(contentStart, endIdx).trim();
}

function extractNumber(html: string, label: string): number {
  // Look for patterns like "Wins\n<span>5</span>" or "Wins</span><span>5</span>"
  const patterns = [
    new RegExp(label + '[^\\d]*?(\\d+)', 'i'),
    new RegExp(label + '[\\s\\S]*?>(\\d+)<', 'i'),
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function extractPercentage(html: string, label: string): number {
  const patterns = [
    new RegExp(label + '[^\\d]*?(\\d+\\.?\\d*)%', 'i'),
    new RegExp(label + '[\\s\\S]*?>(\\d+\\.?\\d*)%?<', 'i'),
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return parseFloat(m[1]);
  }
  return 0;
}

function parseProfile(html: string): RacenetProfile {
  const totalRuns = extractNumber(html, 'Starts') || extractNumber(html, 'Runs') || extractNumber(html, 'Career');
  const totalWins = extractNumber(html, 'Win(?:s)?(?!</)');
  const totalSeconds = extractNumber(html, '2nd') || extractNumber(html, 'Second');
  const totalThirds = extractNumber(html, '3rd') || extractNumber(html, 'Third');

  const winPercentage = extractPercentage(html, 'Win') || (totalRuns > 0 ? Math.round((totalWins / totalRuns) * 100) : 0);
  const placePercentage = extractPercentage(html, 'Place') || (totalRuns > 0 ? Math.round(((totalWins + totalSeconds + totalThirds) / totalRuns) * 100) : 0);

  // Prize money
  const prizeMatch = html.match(/(?:Prize\s*Money|Prizemoney|Earnings)[^$]*\$([0-9,]+(?:\.\d{2})?)/i);
  const totalPrizeMoney = prizeMatch ? `$${prizeMatch[1]}` : '$0';

  // Trainer
  const trainerMatch = html.match(/Trainer[^>]*>[^>]*>([^<]+)</i) || html.match(/Trainer[:\s]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
  const trainer = trainerMatch ? trainerMatch[1].trim() : '';

  const locationMatch = html.match(/Trainer[^>]*>[^>]*>[^>]*>[^>]*>([^<]+)</i);
  const trainerLocation = locationMatch ? locationMatch[1].trim() : '';

  // Age, sex, colour
  const ageMatch = html.match(/(\d+)(?:yo|y\.o\.|[\s-]+year[\s-]+old)/i);
  const age = ageMatch ? ageMatch[1] : '';

  const sexMatch = html.match(/\b(Gelding|Mare|Filly|Colt|Stallion|Horse|Ridgling)\b/i);
  const sex = sexMatch ? sexMatch[1] : '';

  const colourMatch = html.match(/\b(Bay|Brown|Chestnut|Grey|Black|Roan|Piebald|Skewbald)\b/i);
  const colour = colourMatch ? colourMatch[1] : '';

  // Last 5 runs - look for race history table rows
  const lastFiveRuns: RacenetProfile['lastFiveRuns'] = [];
  // Common pattern: table rows with race results
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];

  let resultRowCount = 0;
  for (const row of rows) {
    if (resultRowCount >= 5) break;
    // Look for rows that contain a date pattern and a finish position
    const dateMatch = row.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i)
      || row.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    const posMatch = row.match(/(?:position|finish|result)[^>]*>(\d+)(?:st|nd|rd|th)?</i)
      || row.match(/>(\d{1,2})(?:st|nd|rd|th)?<\/(?:td|span)/i);

    if (dateMatch && posMatch) {
      const cells = row.match(/>([^<]+)</g)?.map(s => s.substring(1)) || [];
      const venueCell = cells.find(c => /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(c.trim()) && c.trim().length > 2);
      const distMatch = row.match(/(\d{3,4})m/);
      const startersMatch = row.match(/\/(\d+)/);
      const jockeyCell = cells.find(c => /^[A-Z]\.\s?[A-Z][a-z]+/.test(c.trim()));

      lastFiveRuns.push({
        date: dateMatch[1],
        venue: venueCell?.trim() || '',
        distance: distMatch ? distMatch[1] : '',
        finishPosition: posMatch[1],
        totalStarters: startersMatch ? startersMatch[1] : '',
        jockey: jockeyCell?.trim() || '',
      });
      resultRowCount++;
    }
  }

  return {
    totalRuns,
    totalWins,
    totalSeconds,
    totalThirds,
    winPercentage,
    placePercentage,
    totalPrizeMoney,
    lastFiveRuns,
    trainer,
    trainerLocation,
    age,
    sex,
    colour,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeHorseProfile(horseName: string): Promise<RacenetProfile | null> {
  const cacheKey = horseName.toLowerCase();
  if (profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey) ?? null;
  }

  const slug = toSlug(horseName);
  const url = `https://www.racenet.com.au/profiles/horse/${slug}`;

  try {
    const res = await fetch(url, { headers: RACENET_HEADERS });
    if (res.status === 404 || !res.ok) {
      profileCache.set(cacheKey, null);
      return null;
    }

    const html = await res.text();
    const profile = parseProfile(html);
    profileCache.set(cacheKey, profile);
    return profile;
  } catch {
    profileCache.set(cacheKey, null);
    return null;
  }
}

interface Runner {
  name: string;
  [key: string]: unknown;
}

export interface EnrichedRunner extends Runner {
  racenetProfile?: RacenetProfile;
  racenetEnriched: boolean;
}

export async function enrichRaceWithRacenet(runners: Runner[]): Promise<EnrichedRunner[]> {
  const enriched: EnrichedRunner[] = [];
  const batchSize = 3;

  for (let i = 0; i < runners.length; i += batchSize) {
    const batch = runners.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (runner) => {
        try {
          const profile = await scrapeHorseProfile(runner.name);
          return {
            ...runner,
            racenetProfile: profile ?? undefined,
            racenetEnriched: profile !== null,
          } as EnrichedRunner;
        } catch {
          return { ...runner, racenetEnriched: false } as EnrichedRunner;
        }
      })
    );

    enriched.push(...results);

    // Delay between batches (not after the last one)
    if (i + batchSize < runners.length) {
      await delay(500);
    }
  }

  return enriched;
}
