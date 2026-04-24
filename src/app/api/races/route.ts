import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return Response.json({ events: [], count: 0 });
  }

  try {
    const sql = neon(dbUrl);
    const today = new Date().toISOString().split('T')[0];
    const rows = await sql`SELECT data FROM races WHERE race_date = ${today} LIMIT 1`;
    
    if (rows.length === 0) {
      return Response.json({ events: [], count: 0 });
    }

    const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    const events = data?.events || [];

    return Response.json(
      { events, count: events.length, source: data?.source || 'db' },
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch {
    return Response.json({ events: [], count: 0 });
  }
}
