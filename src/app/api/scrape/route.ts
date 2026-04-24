import { promises as fs } from 'fs';
import path from 'path';
import type { SportEvent } from '@/lib/types';
import { enrichRaceWithRacenet } from '@/lib/racenet';

export const dynamic = 'force-dynamic';

const SPORTSBET_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.sportsbet.com.au/',
  'Accept-Language': 'en-AU,en;q=0.9',
};

const RACES_FILE = path.join(process.cwd(), 'data', 'today-races.json');

interface SportsbetRunner {
  runnerName?: string;
  runnerNumber?: number;
  jockeyName?: string;
  trainerName?: string;
  barrierNumber?: number;
  handicapWeight?: number;
  formComment?: string;
  fixedOdds?: { returnWin?: number };
  parimutuelOdds?: { returnWin?: number };
}

interface SportsbetRace {
  raceName?: string;
  raceNumber?: number;
  meetingName?: string;
  venueName?: string;
  meetingDate?: string;
  raceStartTime?: string;
  advertisedStartTime?: string;
  runners?: SportsbetRunner[];
  raceType?: string;
  distance?: number;
  raceClassConditions?: string;
}

interface NextToJumpEntry {
  race?: SportsbetRace;
  meeting?: { meetingName?: string; venueName?: string; location?: string };
}

function parseRace(
  raw: SportsbetRace | NextToJumpEntry,
  type: 'Horse Racing' | 'Greyhounds' | 'Harness',
  index: number
): SportEvent | null {
  // Handle both nested (NextToJump) and flat (Schedule) shapes
  const race: SportsbetRace =
    'race' in raw && raw.race ? raw.race : (raw as SportsbetRace);
  const meeting = 'meeting' in raw ? raw.meeting : null;

  const runners = race.runners;
  if (!runners || runners.length === 0) return null;

  const trackName =
    race.meetingName ||
    race.venueName ||
    meeting?.meetingName ||
    meeting?.venueName ||
    'Unknown';
  const raceNum = race.raceNumber || index + 1;
  const raceName = race.raceName || `Race ${raceNum}`;
  const distance = race.distance ? ` ${race.distance}m` : '';
  const conditions = race.raceClassConditions
    ? ` - ${race.raceClassConditions}`
    : '';

  const startTime =
    race.raceStartTime ||
    race.advertisedStartTime ||
    new Date().toISOString();

  const teams: string[] = [];
  const odds: Record<string, number> = {};
  const runnersDetail: Array<{
    name: string;
    number: number;
    jockey: string;
    trainer: string;
    barrier: number;
    weight: number;
    form: string;
    winOdds: number;
  }> = [];

  for (const r of runners) {
    const name = r.runnerName || 'Unknown';
    const winOdds = r.fixedOdds?.returnWin || r.parimutuelOdds?.returnWin || 0;
    if (winOdds <= 0) continue; // scratched or no odds

    teams.push(name);
    odds[name] = winOdds;
    runnersDetail.push({
      name,
      number: r.runnerNumber || 0,
      jockey: r.jockeyName || '',
      trainer: r.trainerName || '',
      barrier: r.barrierNumber || 0,
      weight: r.handicapWeight || 0,
      form: r.formComment || '',
      winOdds,
    });
  }

  if (teams.length < 2) return null;

  return {
    id: `${type.toLowerCase().replace(/\s/g, '-')}-${trackName.toLowerCase().replace(/\s/g, '-')}-r${raceNum}`,
    sport: type === 'Harness' ? 'Horse Racing' : type,
    event: `Race ${raceNum} ${trackName}${conditions}${distance}`,
    teams,
    odds,
    startTime,
    venue: `${trackName}${meeting?.location ? `, ${meeting.location}` : ''}`,
    // Extra racing detail stored in the event for AI analysis
    ...(runnersDetail.length > 0 ? { runners: runnersDetail } : {}),
  } as SportEvent;
}

async function fetchNextToJump(
  type: 'Horse' | 'Greyhound' | 'Harness',
  maxRaces: number
): Promise<SportEvent[]> {
  const url = `https://www.sportsbet.com.au/apigw/sportsbook-racing/Sportsbook/Racing/NextToJump/${type}?maxRaces=${maxRaces}`;
  const res = await fetch(url, { headers: SPORTSBET_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`NextToJump/${type} returned ${res.status}`);
  const data = await res.json();

  const sportType =
    type === 'Horse'
      ? 'Horse Racing'
      : type === 'Greyhound'
        ? 'Greyhounds'
        : 'Harness';

  // Response may be an array directly or nested under a key
  const entries: unknown[] = Array.isArray(data) ? data : data.races || data.events || [];
  const events: SportEvent[] = [];

  for (let i = 0; i < entries.length; i++) {
    const parsed = parseRace(
      entries[i] as SportsbetRace | NextToJumpEntry,
      sportType as 'Horse Racing' | 'Greyhounds' | 'Harness',
      i
    );
    if (parsed) events.push(parsed);
  }

  return events;
}

async function fetchSchedule(): Promise<SportEvent[]> {
  const url =
    'https://www.sportsbet.com.au/apigw/sportsbook-racing/Sportsbook/Racing/Schedule/Horse/Today';
  const res = await fetch(url, { headers: SPORTSBET_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Schedule returned ${res.status}`);
  const data = await res.json();

  const meetings: unknown[] = Array.isArray(data)
    ? data
    : data.meetings || data.races || [];

  const events: SportEvent[] = [];
  for (const meeting of meetings) {
    const m = meeting as { races?: SportsbetRace[]; meetingName?: string };
    const races = m.races || [];
    for (let i = 0; i < races.length; i++) {
      const parsed = parseRace(races[i], 'Horse Racing', i);
      if (parsed) events.push(parsed);
    }
  }
  return events;
}

function getMockEvents(): SportEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d: Date, h: number, m: number) => {
    const date = new Date(d);
    date.setHours(h, m, 0, 0);
    return date.toISOString();
  };

  return [
    {
      id: 'race-001',
      sport: 'Horse Racing',
      event: 'Race 4 Flemington - Maiden Plate 1400m',
      teams: ['Starlight Express', 'Thunder Road', 'Coastal Storm', 'River King'],
      odds: { 'Starlight Express': 3.2, 'Thunder Road': 2.85, 'Coastal Storm': 4.5, 'River King': 5.0 },
      startTime: fmt(today, 14, 15),
      venue: 'Flemington, Melbourne',
    },
    {
      id: 'race-002',
      sport: 'Horse Racing',
      event: 'Race 6 Randwick - BM78 Handicap 1600m',
      teams: ['Midnight Shadow', 'Ocean Fury', 'Golden Mile', 'Desert Prince'],
      odds: { 'Midnight Shadow': 2.6, 'Ocean Fury': 3.45, 'Golden Mile': 4.2, 'Desert Prince': 6.5 },
      startTime: fmt(today, 15, 30),
      venue: 'Royal Randwick, Sydney',
    },
    {
      id: 'race-003',
      sport: 'Horse Racing',
      event: 'Race 3 Ascot - Class 3 1200m',
      teams: ['Lightning Bolt', 'Perth Glory', 'Western Wind'],
      odds: { 'Lightning Bolt': 1.95, 'Perth Glory': 3.8, 'Western Wind': 4.1 },
      startTime: fmt(today, 13, 45),
      venue: 'Ascot, Perth',
    },
    {
      id: 'dogs-001',
      sport: 'Greyhounds',
      event: 'Race 5 Sandown Park - Grade 5 515m',
      teams: ['Flying Maggie', 'Black Tornado', 'Speed Demon', 'Lucky Charm'],
      odds: { 'Flying Maggie': 2.4, 'Black Tornado': 3.6, 'Speed Demon': 4.8, 'Lucky Charm': 7.5 },
      startTime: fmt(today, 19, 42),
      venue: 'Sandown Park, Melbourne',
    },
    {
      id: 'dogs-002',
      sport: 'Greyhounds',
      event: 'Race 8 Wentworth Park - Masters 520m',
      teams: ['Rapid Fire', 'Shadow Runner', 'Miss Swift'],
      odds: { 'Rapid Fire': 1.85, 'Shadow Runner': 3.25, 'Miss Swift': 5.5 },
      startTime: fmt(today, 21, 15),
      venue: 'Wentworth Park, Sydney',
    },
    {
      id: 'race-004',
      sport: 'Horse Racing',
      event: 'Race 7 Morphettville - Group 3 2000m',
      teams: ['Adelaide Star', 'Southern Cross', 'Hills Hero', 'Red Admiral'],
      odds: { 'Adelaide Star': 2.9, 'Southern Cross': 3.15, 'Hills Hero': 4.8, 'Red Admiral': 8.0 },
      startTime: fmt(today, 16, 20),
      venue: 'Morphettville, Adelaide',
    },
  ];
}

export async function GET() {
  let events: SportEvent[] = [];
  let source: 'live' | 'mock' = 'live';

  try {
    // Fetch all three racing types in parallel
    const [horses, greyhounds, harness] = await Promise.all([
      fetchNextToJump('Horse', 20).catch(() => [] as SportEvent[]),
      fetchNextToJump('Greyhound', 10).catch(() => [] as SportEvent[]),
      fetchNextToJump('Harness', 10).catch(() => [] as SportEvent[]),
    ]);

    events = [...horses, ...greyhounds, ...harness];

    // If NextToJump returned nothing, try Schedule fallback
    if (events.length === 0) {
      events = await fetchSchedule();
    }
  } catch {
    // All Sportsbet endpoints failed
  }

  // If still empty, use mock data
  if (events.length === 0) {
    events = getMockEvents();
    source = 'mock';
  }

  // Sort by start time
  events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Enrich horse/greyhound runners with Racenet profile data
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

  // Cache to data/today-races.json
  try {
    await fs.writeFile(
      RACES_FILE,
      JSON.stringify({ events, source, fetchedAt: new Date().toISOString() }, null, 2)
    );
  } catch {
    // Non-critical if cache write fails
  }

  return Response.json(
    { events, count: events.length, source },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}
