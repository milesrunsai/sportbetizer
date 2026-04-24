import { promises as fs } from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import type { SportEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

const RACES_FILE = path.join(process.cwd(), 'data', 'today-races.json');
const MAX_RACES = 15;

interface ScrapedRunner {
  name: string;
  number: number;
  barrier: number;
  jockey: string;
  trainer: string;
  weight: number;
  form: string;
  career: string;
  winOdds: number;
}

// ────────────────────────────────────────
// TAB API Scraper (works from Australian IPs / Vercel Sydney region)
// ────────────────────────────────────────

const TAB_API_BASE = 'https://api.beta.tab.com.au/v1';
const TAB_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': BROWSER_HEADERS['User-Agent'],
  Origin: 'https://www.tab.com.au',
  Referer: 'https://www.tab.com.au/',
};

interface TabMeeting {
  meetingName: string;
  location: string;
  meetingDate: string;
  raceType: string;
  sellCode?: { meetingCode: string; scheduledType: string };
  races: TabRace[];
}

interface TabRace {
  raceNumber: number;
  raceName: string;
  raceDistance: number;
  raceStartTime: string;
  runners?: TabRunner[];
  results?: unknown;
}

interface TabRunner {
  runnerName: string;
  runnerNumber: number;
  barrierNumber: number;
  riderDriverName?: string;
  trainerName?: string;
  handicapWeight?: number;
  last5Starts?: string;
  fixedOdds?: { returnWin?: { $numberDecimal?: string } | number };
  parimutuel?: { returnWin?: number };
}

async function scrapeTab(): Promise<SportEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${TAB_API_BASE}/tab-info-service/racing/dates/${today}/meetings?jurisdiction=NSW`,
      { headers: TAB_HEADERS, signal: controller.signal, cache: 'no-store' },
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`TAB API ${res.status}`);
    const data = await res.json();

    const meetings: TabMeeting[] = Array.isArray(data) ? data : data?.meetings || [];
    if (meetings.length === 0) throw new Error('No TAB meetings');

    const events: SportEvent[] = [];
    let total = 0;

    for (const meeting of meetings) {
      if (total >= MAX_RACES) break;
      if (!meeting.races?.length) continue;

      const venue = meeting.meetingName || meeting.location || 'Unknown';
      const raceType = meeting.raceType?.toUpperCase();
      const sport: SportEvent['sport'] =
        raceType === 'G' ? 'Greyhounds' : 'Horse Racing';

      for (const race of meeting.races) {
        if (total >= MAX_RACES) break;
        if (race.results) continue; // skip already-resulted races
        if (!race.runners?.length) {
          // Try fetching individual race for runner data
          const meetingCode = meeting.sellCode?.meetingCode;
          const schedType = meeting.sellCode?.scheduledType;
          if (meetingCode && schedType) {
            try {
              const raceRes = await fetch(
                `${TAB_API_BASE}/tab-info-service/racing/dates/${today}/meetings/${schedType}/${meetingCode}/races/${race.raceNumber}?jurisdiction=NSW`,
                { headers: TAB_HEADERS, cache: 'no-store' },
              );
              if (raceRes.ok) {
                const raceData = await raceRes.json();
                race.runners = raceData?.runners || [];
              }
            } catch {
              // Continue without runners
            }
          }
        }

        const runners = (race.runners || [])
          .filter((r: TabRunner) => r.runnerName)
          .map((r: TabRunner): ScrapedRunner => {
            let winOdds = 0;
            if (r.fixedOdds?.returnWin) {
              const fw = r.fixedOdds.returnWin;
              winOdds = typeof fw === 'number' ? fw : parseFloat(fw?.$numberDecimal || '0');
            }
            if (!winOdds && r.parimutuel?.returnWin) {
              winOdds = r.parimutuel.returnWin;
            }
            return {
              name: r.runnerName.toUpperCase(),
              number: r.runnerNumber || 0,
              barrier: r.barrierNumber || 0,
              jockey: r.riderDriverName || '',
              trainer: r.trainerName || '',
              weight: r.handicapWeight || 0,
              form: r.last5Starts || '',
              career: '',
              winOdds,
            };
          });

        const activeRunners = runners.filter((r) => r.winOdds > 0);
        if (activeRunners.length < 2) continue;

        const teams = activeRunners.map((r) => r.name);
        const odds: Record<string, number> = {};
        for (const r of activeRunners) odds[r.name] = r.winOdds;

        const id = `${sport === 'Greyhounds' ? 'dogs' : 'horse-racing'}-${venue.toLowerCase().replace(/\s/g, '-')}-r${race.raceNumber}`;
        const eventName = `Race ${race.raceNumber} ${venue} - ${race.raceName || ''} ${race.raceDistance ? `(${race.raceDistance}m)` : ''}`.trim();

        events.push({
          id,
          sport,
          event: eventName,
          teams,
          odds,
          startTime: race.raceStartTime || new Date().toISOString(),
          venue,
          runners: activeRunners.map((r) => ({
            name: r.name,
            number: r.number,
            jockey: r.jockey,
            trainer: r.trainer,
            barrier: r.barrier,
            weight: r.weight,
            form: r.form,
            career: r.career,
            winOdds: r.winOdds,
          })),
        } as SportEvent);
        total++;
      }
    }

    if (events.length === 0) throw new Error('No TAB races with runners');
    return events;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ────────────────────────────────────────
// Racing NSW HTML Scraper (works globally, no odds)
// ────────────────────────────────────────

const RACING_NSW_BASE = 'https://racing.racingnsw.com.au/FreeFields';
const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'];

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Format today's date as Racing NSW expects: "2026Apr24"
 */
function racingNswDate(): string {
  const now = new Date();
  // Use AEST (UTC+10) for the date
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${aest.getUTCFullYear()}${months[aest.getUTCMonth()]}${String(aest.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Discover today's meetings from Racing NSW calendar across all states.
 */
async function discoverMeetings(): Promise<{ key: string; venue: string; state: string }[]> {
  const dateStr = racingNswDate();
  const meetings: { key: string; venue: string; state: string }[] = [];

  // Fetch all states in parallel
  const results = await Promise.all(
    STATES.map(async (state) => {
      try {
        const html = await fetchHTML(`${RACING_NSW_BASE}/Calendar_Meetings.aspx?State=${state}`);
        const regex = /StageMeeting\.aspx\?Key=([^"&]+)/g;
        const found: { key: string; venue: string; state: string }[] = [];
        let m;
        while ((m = regex.exec(html)) !== null) {
          const key = m[1];
          // Only today's meetings, skip trials
          if (key.startsWith(dateStr) && !key.includes('Trial')) {
            // Key format: "2026Apr24,NSW,Coffs Harbour"
            const parts = key.split(',');
            const venue = parts.slice(2).join(',').trim();
            if (venue && !found.some((f) => f.venue === venue)) {
              found.push({ key, venue, state: parts[1] || state });
            }
          }
        }
        return found;
      } catch {
        return [];
      }
    }),
  );

  for (const r of results) meetings.push(...r);
  return meetings;
}

/**
 * Parse time string like "12:19PM" into an ISO date string for today (AEST).
 */
function parseAestTime(timeStr: string): string {
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return new Date().toISOString();

  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  // Build date in AEST (UTC+10), then convert to UTC
  const now = new Date();
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const dateStr = `${aest.getUTCFullYear()}-${String(aest.getUTCMonth() + 1).padStart(2, '0')}-${String(aest.getUTCDate()).padStart(2, '0')}`;
  const utcHours = hours - 10; // AEST to UTC
  return `${dateStr}T${String(utcHours < 0 ? utcHours + 24 : utcHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00Z`;
}

interface ParsedRace {
  raceNum: number;
  time: string;
  name: string;
  distance: string;
  runners: ScrapedRunner[];
}

/**
 * Parse all races from a Racing NSW Form.aspx meeting page.
 * Each page has all races for a meeting in table strips.
 */
function parseMeetingPage(html: string): ParsedRace[] {
  const races: ParsedRace[] = [];

  // Find race headers: "Race N - HH:MMAM RACE NAME (DISTANCE METRES)"
  // The HTML has tag breaks between "Race N" and "- HH:MMAM..."
  const raceHeaderP = /Race\s+(\d+)[^]*?-\s*(\d{1,2}:\d{2}(?:AM|PM))\s+([^(]+)\((\d+)\s*METRES?\)/gi;
  let m;
  const raceHeaders: { raceNum: number; time: string; name: string; distance: string; index: number }[] = [];
  while ((m = raceHeaderP.exec(html)) !== null) {
    raceHeaders.push({
      raceNum: parseInt(m[1]),
      time: m[2],
      name: m[3].trim(),
      distance: m[4] + 'm',
      index: m.index,
    });
  }

  // Find all runner tables
  const tableP = /class="OddsBet-EvensBet race-strip-fields">([\s\S]*?)<\/table>/g;
  const tables: string[] = [];
  while ((m = tableP.exec(html)) !== null) {
    tables.push(m[1]);
  }

  // Parse each table's runner rows
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const header = raceHeaders[i];
    const raceNum = header?.raceNum || i + 1;
    const time = header?.time || '';
    const name = header?.name || `Race ${raceNum}`;
    const distance = header?.distance || '';

    const rowP = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const runners: ScrapedRunner[] = [];
    let row;
    while ((row = rowP.exec(table)) !== null) {
      const cells = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 6) continue;

      const getText = (cell: string) => stripTags(cell);
      const numStr = getText(cells[0]);
      const num = parseInt(numStr, 10);
      if (isNaN(num)) continue;

      const form = getText(cells[1]);
      const runnerName = getText(cells[2]);
      const trainer = getText(cells[3]);
      const jockeyRaw = getText(cells[4]);
      const barrier = parseInt(getText(cells[5]), 10) || 0;
      const weight = parseFloat(getText(cells[6] || '')) || 0;

      // Clean jockey name: remove apprentice claim info like "(a2/55.5kg)"
      const jockey = jockeyRaw.replace(/\s*\([^)]*\)\s*$/, '').trim();

      if (runnerName.length < 2) continue;

      runners.push({
        name: runnerName,
        number: num,
        barrier,
        jockey,
        trainer,
        weight,
        form,
        career: '',
        winOdds: 0,
      });
    }

    if (runners.length >= 2) {
      races.push({ raceNum, time, name, distance, runners });
    }
  }

  return races;
}

/**
 * Scrape race data from Racing NSW Form.aspx pages.
 * Returns SportEvents without odds (Racing NSW is a regulatory body, not a bookmaker).
 */
async function scrapeRacingNsw(): Promise<SportEvent[]> {
  const meetings = await discoverMeetings();
  if (meetings.length === 0) return [];

  const events: SportEvent[] = [];
  let total = 0;

  // Scrape meetings in parallel (up to 3 at a time)
  for (let i = 0; i < meetings.length && total < MAX_RACES; i += 3) {
    const batch = meetings.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (meeting) => {
        try {
          const url = `${RACING_NSW_BASE}/Form.aspx?Key=${encodeURIComponent(meeting.key)}`;
          const html = await fetchHTML(url);
          return { meeting, races: parseMeetingPage(html) };
        } catch {
          return { meeting, races: [] };
        }
      }),
    );

    for (const { meeting, races } of results) {
      for (const race of races) {
        if (total >= MAX_RACES) break;

        const startTime = race.time ? parseAestTime(race.time) : new Date().toISOString();
        const venue = meeting.venue;
        const teams = race.runners.map((r) => r.name);
        const odds: Record<string, number> = {};
        // No odds from Racing NSW - leave empty, AI models will analyze on form/jockey/trainer

        const id = `horse-racing-${venue.toLowerCase().replace(/\s/g, '-')}-r${race.raceNum}`;
        const eventName = `Race ${race.raceNum} ${venue} - ${race.name} ${race.distance ? `(${race.distance})` : ''}`.trim();

        events.push({
          id,
          sport: 'Horse Racing',
          event: eventName,
          teams,
          odds,
          startTime,
          venue,
          runners: race.runners.map((r) => ({
            name: r.name,
            number: r.number,
            jockey: r.jockey,
            trainer: r.trainer,
            barrier: r.barrier,
            weight: r.weight,
            form: r.form,
            career: r.career,
            winOdds: r.winOdds,
          })),
        } as SportEvent);
        total++;
      }
    }

    if (i + 3 < meetings.length && total < MAX_RACES) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return events;
}

// ────────────────────────────────────────
// DB persistence
// ────────────────────────────────────────

async function saveToDb(events: SportEvent[]): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || events.length === 0) return;
  try {
    const sql = neon(url);
    const today = new Date().toISOString().split('T')[0];
    const data = JSON.stringify({ events, scrapedAt: new Date().toISOString(), count: events.length });
    await sql`INSERT INTO races (race_date, data) VALUES (${today}, ${data}::jsonb) ON CONFLICT (race_date) DO UPDATE SET data = ${data}::jsonb`;
    await sql`DELETE FROM today_analysis WHERE date = ${today}`;
  } catch {
    // Non-critical if DB write fails
  }
}

// ────────────────────────────────────────
// Route handler
// ────────────────────────────────────────

export async function GET() {
  let events: SportEvent[] = [];
  let source = 'tab';

  // 1. Try TAB API (works from Australian IPs / Vercel Sydney region)
  try {
    events = await scrapeTab();
  } catch {
    // TAB API geo-blocked or unavailable
  }

  // 2. Fallback to Racing NSW (works globally, no odds)
  if (events.length === 0) {
    source = 'racing-nsw';
    try {
      events = await scrapeRacingNsw();
    } catch {
      // Both sources failed
    }
  }

  // Sort by start time
  events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  // Save to DB
  await saveToDb(events);

  // Cache to local file (non-critical)
  try {
    await fs.writeFile(
      RACES_FILE,
      JSON.stringify({ events, source, fetchedAt: new Date().toISOString() }, null, 2),
    );
  } catch {
    // Non-critical
  }

  return Response.json(
    { events, count: events.length, source },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    },
  );
}
