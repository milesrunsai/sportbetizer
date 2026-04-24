#!/usr/bin/env node
/**
 * TAB Race Scraper — runs via browser automation to fetch live TAB data
 * and push to Neon DB. Run periodically or on-demand.
 * 
 * Usage: node scripts/tab-scrape.mjs
 * Requires: DATABASE_URL in .env
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env.local */ }

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DB_URL);

// This script is called with JSON race data piped in or as argument
const jsonArg = process.argv[2];
if (!jsonArg) {
  console.error('Usage: node tab-scrape.mjs \'{"events": [...]}\'');
  process.exit(1);
}

const data = JSON.parse(jsonArg);
const today = new Date().toISOString().split('T')[0];

const payload = JSON.stringify({
  events: data.events,
  scrapedAt: new Date().toISOString(),
  count: data.events.length,
  source: 'tab'
});

await sql`INSERT INTO races (race_date, data) VALUES (${today}, ${payload}::jsonb) ON CONFLICT (race_date) DO UPDATE SET data = ${payload}::jsonb`;
await sql`DELETE FROM today_analysis WHERE date = ${today}`;

console.log(`Saved ${data.events.length} races to DB for ${today}`);
