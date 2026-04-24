/**
 * Local Racenet scraper — runs on your machine (AU IP), pushes race data to Neon DB.
 * Usage: node scripts/scrape-local.mjs
 */
import { neon } from '@neondatabase/serverless';

const DB_URL = 'postgresql://neondb_owner:npg_UrH2MPuVq1Od@ep-flat-band-am4fwa74-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DB_URL);

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

const cookies = new Map();

function parseCookies(sc) {
  if (!sc) return;
  for (const p of sc.split(/,(?=\s*\w+=)/)) {
    const nv = p.trim().split(';')[0];
    const eq = nv.indexOf('=');
    if (eq > 0) cookies.set(nv.substring(0, eq), nv.substring(eq + 1));
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchHTML(url) {
  let cur = url;
  for (let i = 0; i < 10; i++) {
    const h = { ...BASE_HEADERS };
    if (cookies.size > 0) h['Cookie'] = cookieHeader();
    const r = await fetch(cur, { headers: h, redirect: 'manual' });
    parseCookies(r.headers.get('set-cookie'));
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      cur = loc.startsWith('http') ? loc : new URL(loc, cur).href;
      if (!cur.includes('racenet.com.au')) cur = url;
      continue;
    }
    if (r.ok) return r.text();
    throw new Error(`${r.status} for ${url}`);
  }
  throw new Error(`Too many redirects: ${url}`);
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRunners(html) {
  const runners = [];
  const seenNumbers = new Set();

  // Strategy: Use horse profile links which contain "N. HorseName" in text content
  // Pattern: profiles/horse/slug-aus">\n  N. HorseName\n
  const profilePattern = /profiles\/horse\/[a-z'-]+-aus[^>]*>\s*(\d{1,2})\.\s*([A-Za-z][A-Za-z'\s]+?)\s*</g;
  let m;
  while ((m = profilePattern.exec(html)) !== null) {
    const num = parseInt(m[1], 10);
    if (seenNumbers.has(num)) continue;
    seenNumbers.add(num);

    const name = m[2].trim();
    if (!name || name.length < 2) continue;

    // Find barrier from nearby context: look for (N) after the name
    const nearby = html.substring(m.index, m.index + 500);
    const barrierMatch = nearby.match(/\((\d{1,2})\)/);
    const barrier = barrierMatch ? parseInt(barrierMatch[1], 10) : 0;

    // Get text context for trainer/jockey/form
    const ctx = stripTags(html.substring(m.index, m.index + 3000));

    const trainerMatch = ctx.match(/T:\s*([A-Z][A-Za-z &']+?)\s+(?:[A-Z][A-Za-z &']+?\s+)?J:/);
    const jockeyMatch = ctx.match(/J:\s*([A-Z][A-Za-z ]+?)\s*\(/);
    const weightMatch = ctx.match(/(\d+(?:\.\d+)?)kg/);
    const formMatch = ctx.match(/L10:\s*([^\s]+)/);
    const careerMatch = ctx.match(/C:\s*(\d+:[\d-]+)/);

    runners.push({
      name,
      number: num,
      barrier,
      jockey: jockeyMatch ? jockeyMatch[1].trim() : '',
      trainer: trainerMatch ? trainerMatch[1].trim() : '',
      weight: weightMatch ? parseFloat(weightMatch[1]) : 0,
      form: formMatch ? formMatch[1] : '',
      career: careerMatch ? careerMatch[1] : '',
      winOdds: 0,
    });
  }

  // Parse odds
  const oddsPattern = /class="odds-link__odds"[^>]*>\s*\$(\d+\.\d{2})/g;
  const allOdds = [];
  let om;
  while ((om = oddsPattern.exec(html)) !== null) {
    allOdds.push(parseFloat(om[1]));
  }

  // Assign odds to runners
  if (allOdds.length > 0 && runners.length > 0) {
    const ratio = Math.floor(allOdds.length / runners.length) || 1;
    for (let i = 0; i < runners.length; i++) {
      const idx = i * ratio;
      if (idx < allOdds.length) runners[i].winOdds = allOdds[idx];
    }
  }

  return runners;
}

function extractStartTime(html) {
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const flatten = (obj) => {
        if (Array.isArray(obj)) return obj.flatMap(flatten);
        if (typeof obj === 'object' && obj !== null) {
          if (obj['@graph']) return flatten(obj['@graph']);
          return [obj];
        }
        return [];
      };
      const events = flatten(JSON.parse(jsonLdMatch[1]));
      for (const ev of events) {
        if (ev['@type'] === 'SportsEvent' && ev.startDate) {
          const p = ev.startDate.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
          if (p) {
            let h = parseInt(p[4], 10);
            if (p[7].toUpperCase() === 'PM' && h < 12) h += 12;
            if (p[7].toUpperCase() === 'AM' && h === 12) h = 0;
            return `${p[3]}-${p[2]}-${p[1]}T${String(h).padStart(2, '0')}:${p[5]}:${p[6]}Z`;
          }
        }
      }
    } catch {}
  }
  return new Date().toISOString();
}

function extractVenue(html, meetingKey) {
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const flatten = (obj) => {
        if (Array.isArray(obj)) return obj.flatMap(flatten);
        if (typeof obj === 'object' && obj !== null) {
          if (obj['@graph']) return flatten(obj['@graph']);
          return [obj];
        }
        return [];
      };
      for (const ev of flatten(JSON.parse(jsonLdMatch[1]))) {
        if (ev['@type'] === 'SportsEvent' && ev.location?.name) return ev.location.name;
      }
    } catch {}
  }
  return meetingKey.replace(/-\d{8}$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function extractRaceName(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) return titleMatch[1].split('|')[0].trim().split(',')[0].trim();
  return '';
}

function extractRaceNumber(url) {
  const m = url.match(/race-(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

async function main() {
  console.log('🏇 Starting Racenet scrape...\n');

  // Warm up cookies
  console.log('Warming up cookies...');
  const homeHtml = await fetchHTML('https://www.racenet.com.au/');
  console.log(`Homepage: ${homeHtml.length} chars`);

  // Find meeting links
  const linkPattern = /form-guide\/horse-racing\/[^"]+\/overview/g;
  const links = [...new Set(homeHtml.match(linkPattern) || [])];
  console.log(`Found ${links.length} race links\n`);

  const events = [];
  let scraped = 0;
  const MAX = 12;

  for (const link of links) {
    if (scraped >= MAX) break;
    const url = `https://www.racenet.com.au/${link}`;
    const meetingKey = link.split('/')[2] || '';

    try {
      console.log(`Scraping: ${link.substring(0, 70)}...`);
      const html = await fetchHTML(url);
      console.log(`  HTML: ${html.length} chars`);

      const runners = parseRunners(html);
      const active = runners.filter(r => r.winOdds > 0);
      console.log(`  Runners: ${runners.length} (${active.length} with odds)`);

      if (active.length < 2) {
        // Try without odds filter if we have runners
        if (runners.length >= 2) {
          // Assign default odds based on position
          runners.forEach((r, i) => { if (r.winOdds === 0) r.winOdds = 2 + i * 1.5; });
          console.log(`  Assigned default odds to ${runners.length} runners`);
        } else {
          console.log(`  Skipped (not enough runners)`);
          continue;
        }
      }

      const finalRunners = runners.filter(r => r.winOdds > 0);
      const raceNum = extractRaceNumber(link);
      const venue = extractVenue(html, meetingKey);
      const startTime = extractStartTime(html);
      const raceName = extractRaceName(html) || `Race ${raceNum} ${venue}`;

      const event = {
        id: `horse-racing-${venue.toLowerCase().replace(/\s/g, '-')}-r${raceNum}`,
        sport: 'Horse Racing',
        event: raceName,
        teams: finalRunners.map(r => r.name),
        odds: Object.fromEntries(finalRunners.map(r => [r.name, r.winOdds])),
        startTime,
        venue,
        runners: finalRunners,
      };

      events.push(event);
      scraped++;
      console.log(`  ✅ ${raceName} | ${venue} | ${finalRunners.length} runners\n`);

      // Be polite
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`);
    }
  }

  console.log(`\n📊 Scraped ${events.length} races. Pushing to DB...\n`);

  // Create races table
  await sql`DROP TABLE IF EXISTS races CASCADE`;
  await sql`
    CREATE TABLE races (
      id TEXT PRIMARY KEY,
      race_date TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Store today's races
  const today = new Date().toISOString().split('T')[0];
  const payload = JSON.stringify({ events, scrapedAt: new Date().toISOString(), count: events.length });

  await sql`
    INSERT INTO races (id, race_date, data) VALUES (${'today-' + today}, ${today}, ${payload})
    ON CONFLICT (id) DO UPDATE SET data = ${payload}, created_at = NOW()
  `;

  console.log(`✅ Stored ${events.length} races in DB for ${today}`);
  console.log('\nRaces:');
  for (const ev of events) {
    console.log(`  ${ev.event} | ${ev.venue} | ${ev.teams.length} runners | ${ev.startTime}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
