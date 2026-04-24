import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

try {
  const envContent = readFileSync(resolve(root, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const sql = neon(process.env.DATABASE_URL);
const today = new Date().toISOString().split('T')[0];

// Read events from stdin or file argument
const eventsJson = readFileSync(resolve(root, 'data', 'tab-races.json'), 'utf-8');
const events = JSON.parse(eventsJson);

const payload = JSON.stringify({events, scrapedAt: new Date().toISOString(), count: events.length, source: 'tab'});
await sql`DELETE FROM races WHERE race_date = ${today}`;
await sql`INSERT INTO races (id, race_date, data) VALUES (gen_random_uuid(), ${today}, ${payload}::jsonb)`;
await sql`DELETE FROM today_analysis WHERE date = ${today}`;
console.log(`Done: ${events.length} races saved to DB for ${today}`);
