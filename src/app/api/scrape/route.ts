import { promises as fs } from 'fs';
import path from 'path';
import type { SportEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

const RACES_FILE = path.join(process.cwd(), 'data', 'today-races.json');
const MAX_RACES = 15;

// Cookie jar for Racenet's redirect chain
const cookieJar = new Map<string, string>();

function parseCookies(setCookie: string | null) {
  if (!setCookie) return;
  const parts = setCookie.split(/,(?=\s*\w+=)/);
  for (const part of parts) {
    const nameVal = part.trim().split(';')[0];
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx > 0) {
      cookieJar.set(nameVal.substring(0, eqIdx), nameVal.substring(eqIdx + 1));
    }
  }
}

function cookieHeader(): string {
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

interface RacenetRunner {
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

/**
 * Fetch HTML from a URL with Racenet headers.
 */
/**
 * Fetch HTML from Racenet with cookie-based redirect handling.
 * Racenet has a multi-step redirect chain:
 * 1. 302 → /remote/check_cookie.html (sets n_regis cookie)
 * 2. 302 → back to original URL
 * 3. 302 → tags.news.com.au (sets nk token)
 * 4. 302 → original URL with ?nk= param
 * 5. 200 → actual HTML
 */
async function fetchHTML(url: string): Promise<string> {
  let currentUrl = url;
  for (let i = 0; i < 10; i++) {
    const headers: Record<string, string> = { ...BASE_HEADERS };
    if (cookieJar.size > 0) headers['Cookie'] = cookieHeader();

    const res = await fetch(currentUrl, { headers, redirect: 'manual', cache: 'no-store' });
    parseCookies(res.headers.get('set-cookie'));

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`Redirect without location at ${currentUrl}`);
      currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).href;
      // Skip external redirects (news.com.au tag generator), retry original
      if (!currentUrl.includes('racenet.com.au')) {
        currentUrl = url;
      }
      continue;
    }

    if (res.ok) return res.text();
    throw new Error(`${url} returned ${res.status}`);
  }
  throw new Error(`Too many redirects for ${url}`);
}

/**
 * Discover today's meeting race URLs from the Racenet homepage.
 * Returns an array of form-guide overview URLs.
 */
async function discoverMeetingLinks(): Promise<string[]> {
  const html = await fetchHTML('https://www.racenet.com.au/');
  // Match links like /form-guide/horse-racing/venue-YYYYMMDD/race-name-race-N/overview
  const regex = /href="(\/form-guide\/horse-racing\/[^"]+\/overview)"/g;
  const links = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.add(match[1]);
  }
  return Array.from(links);
}

/**
 * Group form guide links by meeting (venue-date prefix).
 * Returns a map of meetingKey -> array of race URLs.
 */
function groupByMeeting(links: string[]): Map<string, string[]> {
  const meetings = new Map<string, string[]>();
  for (const link of links) {
    // Extract venue-date part: /form-guide/horse-racing/VENUE-DATE/RACE/overview
    const parts = link.split('/');
    // parts: ['', 'form-guide', 'horse-racing', 'venue-date', 'race-name', 'overview']
    const meetingKey = parts[3] || '';
    if (!meetingKey) continue;
    if (!meetings.has(meetingKey)) meetings.set(meetingKey, []);
    meetings.get(meetingKey)!.push(link);
  }
  return meetings;
}

/**
 * Discover additional race links from a form guide page's meeting event navigation.
 */
async function discoverRacesFromFormGuide(
  html: string,
  meetingKey: string
): Promise<string[]> {
  // Look for meeting-event-number links on the page
  const regex = /href="(\/form-guide\/horse-racing\/[^"]+\/overview)"/g;
  const links = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1].includes(meetingKey)) {
      links.add(match[1]);
    }
  }
  return Array.from(links);
}

/**
 * Parse runner data from a Racenet form guide HTML page.
 */
function parseRunners(html: string): RacenetRunner[] {
  const runners: RacenetRunner[] = [];
  const seenNumbers = new Set<number>();

  // Find all horseracing-selection-details blocks
  const detailBlocks = html.split('horseracing-selection-details');

  for (let i = 1; i < detailBlocks.length; i++) {
    const block = detailBlocks[i];
    // Get a reasonable chunk to parse
    const chunk = block.substring(0, 3000);

    // Runner number - look for a number before the name
    const numMatch = chunk.match(/(?:^|>)\s*(\d{1,2})\s*[.<\s]/);
    const runnerNum = numMatch ? parseInt(numMatch[1], 10) : 0;

    // Dedupe mobile/desktop duplicates
    if (runnerNum > 0 && seenNumbers.has(runnerNum)) continue;
    if (runnerNum > 0) seenNumbers.add(runnerNum);

    // Runner name - typically in a heading or strong tag near the start
    const nameMatch = chunk.match(/>([A-Z][A-Z\s']+(?:\([^)]*\))?)\s*</);
    let name = nameMatch ? nameMatch[1].trim() : '';
    // Clean up - remove barrier in parens from name
    name = name.replace(/\s*\(\d+\)\s*$/, '').trim();
    if (!name || name.length < 2) continue;

    // Barrier
    const barrierMatch = chunk.match(/\((\d{1,2})\)/);
    const barrier = barrierMatch ? parseInt(barrierMatch[1], 10) : 0;

    // Trainer after T:
    const trainerMatch = chunk.match(/T:\s*([^<\n]+)/);
    const trainer = trainerMatch ? trainerMatch[1].trim() : '';

    // Jockey after J:
    const jockeyMatch = chunk.match(/J:\s*([^<\n]+)/);
    const jockey = jockeyMatch ? jockeyMatch[1].trim() : '';

    // Weight in parens like (58kg) or (58.5kg)
    const weightMatch = chunk.match(/\((\d+(?:\.\d+)?)kg\)/);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;

    // Form after L10:
    const formMatch = chunk.match(/L10:\s*([^\s<]+)/);
    const form = formMatch ? formMatch[1].trim() : '';

    // Career after C:
    const careerMatch = chunk.match(/C:\s*([^\s<]+)/);
    const career = careerMatch ? careerMatch[1].trim() : '';

    runners.push({
      name,
      number: runnerNum,
      barrier,
      jockey,
      trainer,
      weight,
      form,
      career,
      winOdds: 0, // Will be filled from odds elements
    });
  }

  // Parse odds from odds-link elements (look for dollar amounts in the field card area)
  // Use a more specific pattern to avoid matching CSS
  const oddsRegex = /class="[^"]*odds-link__odds[^"]*"[^>]*>\s*\$([\d.]+)/g;
  const oddsValues: number[] = [];
  let oddsMatch;
  while ((oddsMatch = oddsRegex.exec(html)) !== null) {
    const val = parseFloat(oddsMatch[1]);
    if (val > 0) oddsValues.push(val);
  }

  // Odds may be duplicated (mobile/desktop) - take first half if doubled
  const expectedCount = runners.length;
  const odds =
    oddsValues.length >= expectedCount * 2
      ? oddsValues.slice(0, expectedCount)
      : oddsValues;

  // Assign odds to runners in order
  for (let i = 0; i < runners.length && i < odds.length; i++) {
    runners[i].winOdds = odds[i];
  }

  return runners;
}

/**
 * Extract start time from JSON-LD SportsEvent or meeting-event-number__time elements.
 */
function extractStartTime(html: string): string {
  // Try JSON-LD first
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const raw = JSON.parse(jsonLdMatch[1]);
      // May be nested: {"@graph": [[{...}]]} or just {...}
      const flatten = (obj: unknown): unknown[] => {
        if (Array.isArray(obj)) return obj.flatMap(flatten);
        if (typeof obj === 'object' && obj !== null) {
          if ('@graph' in obj) return flatten((obj as Record<string, unknown>)['@graph']);
          return [obj];
        }
        return [];
      };
      const events = flatten(raw);
      for (const ev of events) {
        const e = ev as Record<string, unknown>;
        if (e['@type'] === 'SportsEvent' && e.startDate) {
          const dateStr = String(e.startDate);
          // Racenet format: "24/04/2026 05:30:00 AM" (UTC)
          const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
          if (parts) {
            let hours = parseInt(parts[4], 10);
            if (parts[7].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (parts[7].toUpperCase() === 'AM' && hours === 12) hours = 0;
            const isoStr = `${parts[3]}-${parts[2]}-${parts[1]}T${String(hours).padStart(2, '0')}:${parts[5]}:${parts[6]}Z`;
            return isoStr;
          }
          // Try direct parse
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
      }
    } catch {
      // Fall through
    }
  }

  // Try meeting-event-number__time elements
  const timeMatch = html.match(/meeting-event-number__time[^>]*>([^<]+)</);
  if (timeMatch) {
    const timeStr = timeMatch[1].trim();
    // Parse time like "2:30pm" into today's date
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (timeParts) {
      const now = new Date();
      let hours = parseInt(timeParts[1], 10);
      const mins = parseInt(timeParts[2], 10);
      const ampm = timeParts[3].toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      now.setHours(hours, mins, 0, 0);
      return now.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Extract venue name from the page.
 */
function extractVenue(html: string, meetingKey: string): string {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const raw = JSON.parse(jsonLdMatch[1]);
      const flatten = (obj: unknown): unknown[] => {
        if (Array.isArray(obj)) return obj.flatMap(flatten);
        if (typeof obj === 'object' && obj !== null) {
          if ('@graph' in obj) return flatten((obj as Record<string, unknown>)['@graph']);
          return [obj];
        }
        return [];
      };
      const events = flatten(raw);
      for (const ev of events) {
        const e = ev as Record<string, unknown>;
        if (e['@type'] === 'SportsEvent') {
          const loc = e.location as Record<string, unknown> | undefined;
          if (loc?.name) return String(loc.name);
        }
      }
    } catch {
      // Fall through
    }
  }

  // Derive from meeting key: "cranbourne-20260424" -> "Cranbourne"
  const venuePart = meetingKey.replace(/-\d{8}$/, '');
  return venuePart
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Extract race number from URL.
 */
function extractRaceNumber(url: string): number {
  const match = url.match(/race-(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Extract race name/conditions from page title or heading.
 */
function extractRaceName(html: string): string {
  // Try page title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1];
    // Clean up - often like "Race 1 - Maiden Plate | Cranbourne | Racenet"
    const parts = title.split('|');
    if (parts.length > 0) return parts[0].trim();
  }
  return '';
}

/**
 * Scrape a single race from its form guide URL.
 */
async function scrapeRace(
  raceUrl: string,
  meetingKey: string
): Promise<SportEvent | null> {
  const fullUrl = `https://www.racenet.com.au${raceUrl}`;
  const html = await fetchHTML(fullUrl);

  const runners = parseRunners(html);
  // Filter out runners with no odds (scratched)
  const activeRunners = runners.filter((r) => r.winOdds > 0);
  if (activeRunners.length < 2) return null;

  const raceNum = extractRaceNumber(raceUrl);
  const venue = extractVenue(html, meetingKey);
  const startTime = extractStartTime(html);
  const raceName = extractRaceName(html);

  const teams = activeRunners.map((r) => r.name);
  const odds: Record<string, number> = {};
  for (const r of activeRunners) {
    odds[r.name] = r.winOdds;
  }

  const runnersDetail = activeRunners.map((r) => ({
    name: r.name,
    number: r.number,
    jockey: r.jockey,
    trainer: r.trainer,
    barrier: r.barrier,
    weight: r.weight,
    form: r.form,
    career: r.career,
    winOdds: r.winOdds,
  }));

  const id = `horse-racing-${venue.toLowerCase().replace(/\s/g, '-')}-r${raceNum}`;
  const eventName = raceName || `Race ${raceNum} ${venue}`;

  return {
    id,
    sport: 'Horse Racing',
    event: eventName,
    teams,
    odds,
    startTime,
    venue,
    ...(runnersDetail.length > 0 ? { runners: runnersDetail } : {}),
  } as SportEvent;
}

/**
 * Main Racenet scraper: discover meetings, scrape races, return SportEvents.
 */
async function scrapeRacenet(): Promise<SportEvent[]> {
  const links = await discoverMeetingLinks();
  if (links.length === 0) return [];

  const meetings = groupByMeeting(links);
  const events: SportEvent[] = [];
  let totalScraped = 0;

  for (const [meetingKey, raceLinks] of meetings) {
    if (totalScraped >= MAX_RACES) break;

    // Sort race links by race number
    const sorted = raceLinks.sort((a, b) => extractRaceNumber(a) - extractRaceNumber(b));

    // If we only have the first race link, try to discover more from the form guide page
    let allRaceLinks = sorted;
    if (sorted.length === 1) {
      try {
        const html = await fetchHTML(`https://www.racenet.com.au${sorted[0]}`);
        const discovered = await discoverRacesFromFormGuide(html, meetingKey);
        if (discovered.length > sorted.length) {
          allRaceLinks = discovered.sort(
            (a, b) => extractRaceNumber(a) - extractRaceNumber(b)
          );
        }
      } catch {
        // Use what we have
      }
    }

    // Scrape races from this meeting (limit to keep total under MAX_RACES)
    const remaining = MAX_RACES - totalScraped;
    const toScrape = allRaceLinks.slice(0, remaining);

    // Scrape in small batches to be polite
    for (let i = 0; i < toScrape.length; i += 3) {
      const batch = toScrape.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((url) => scrapeRace(url, meetingKey).catch(() => null))
      );
      for (const ev of results) {
        if (ev) {
          events.push(ev);
          totalScraped++;
        }
      }
      // Small delay between batches
      if (i + 3 < toScrape.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  return events;
}

function getMockEvents(): SportEvent[] {
  const today = new Date();

  const fmt = (h: number, m: number) => {
    const date = new Date(today);
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
      startTime: fmt(14, 15),
      venue: 'Flemington, Melbourne',
    },
    {
      id: 'race-002',
      sport: 'Horse Racing',
      event: 'Race 6 Randwick - BM78 Handicap 1600m',
      teams: ['Midnight Shadow', 'Ocean Fury', 'Golden Mile', 'Desert Prince'],
      odds: { 'Midnight Shadow': 2.6, 'Ocean Fury': 3.45, 'Golden Mile': 4.2, 'Desert Prince': 6.5 },
      startTime: fmt(15, 30),
      venue: 'Royal Randwick, Sydney',
    },
    {
      id: 'race-003',
      sport: 'Horse Racing',
      event: 'Race 3 Ascot - Class 3 1200m',
      teams: ['Lightning Bolt', 'Perth Glory', 'Western Wind'],
      odds: { 'Lightning Bolt': 1.95, 'Perth Glory': 3.8, 'Western Wind': 4.1 },
      startTime: fmt(13, 45),
      venue: 'Ascot, Perth',
    },
    {
      id: 'dogs-001',
      sport: 'Greyhounds',
      event: 'Race 5 Sandown Park - Grade 5 515m',
      teams: ['Flying Maggie', 'Black Tornado', 'Speed Demon', 'Lucky Charm'],
      odds: { 'Flying Maggie': 2.4, 'Black Tornado': 3.6, 'Speed Demon': 4.8, 'Lucky Charm': 7.5 },
      startTime: fmt(19, 42),
      venue: 'Sandown Park, Melbourne',
    },
    {
      id: 'dogs-002',
      sport: 'Greyhounds',
      event: 'Race 8 Wentworth Park - Masters 520m',
      teams: ['Rapid Fire', 'Shadow Runner', 'Miss Swift'],
      odds: { 'Rapid Fire': 1.85, 'Shadow Runner': 3.25, 'Miss Swift': 5.5 },
      startTime: fmt(21, 15),
      venue: 'Wentworth Park, Sydney',
    },
    {
      id: 'race-004',
      sport: 'Horse Racing',
      event: 'Race 7 Morphettville - Group 3 2000m',
      teams: ['Adelaide Star', 'Southern Cross', 'Hills Hero', 'Red Admiral'],
      odds: { 'Adelaide Star': 2.9, 'Southern Cross': 3.15, 'Hills Hero': 4.8, 'Red Admiral': 8.0 },
      startTime: fmt(16, 20),
      venue: 'Morphettville, Adelaide',
    },
  ];
}

export async function GET() {
  let events: SportEvent[] = [];
  let source: 'live' | 'mock' = 'live';

  let error: string | undefined;
  try {
    events = await scrapeRacenet();
  } catch (e) {
    error = String(e);
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
    { events, count: events.length, source, ...(error ? { error } : {}) },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}
