'use client';

import { useEffect, useState, useCallback } from 'react';

interface RaceEntry {
  track: string;
  race: string;
  type: 'horse' | 'dog' | 'harness';
  startTime: string;
}

const iconMap: Record<string, string> = {
  horse: '\u{1F3C7}',
  dog: '\u{1F415}',
  harness: '\u{1F3CE}',
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'LIVE';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function classifyType(sport: string): 'horse' | 'dog' | 'harness' {
  const s = sport.toLowerCase();
  if (s.includes('greyhound') || s.includes('dog')) return 'dog';
  if (s.includes('harness')) return 'harness';
  return 'horse';
}

function extractTrackAndRace(event: string, venue: string): { track: string; race: string } {
  const raceMatch = event.match(/Race\s+(\d+)/i);
  const race = raceMatch ? `R${raceMatch[1]}` : '';
  // Use venue for track name, take first part before comma
  const track = venue.split(',')[0].trim() || event.split(' ').slice(0, 2).join(' ');
  return { track, race };
}

export default function LiveTickerBar() {
  const [races, setRaces] = useState<RaceEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/scrape')
      .then((r) => r.json())
      .then((data) => {
        const entries: RaceEntry[] = [];
        for (const ev of data.events || []) {
          const { track, race } = extractTrackAndRace(ev.event, ev.venue);
          entries.push({
            track,
            race,
            type: classifyType(ev.sport),
            startTime: ev.startTime,
          });
        }
        setRaces(entries);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getFilteredRaces = useCallback(() => {
    // Show upcoming races + recently started (within 5 min)
    return races
      .filter((r) => {
        const diff = new Date(r.startTime).getTime() - now;
        return diff > -5 * 60 * 1000; // hide if started more than 5 min ago
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [races, now]);

  const filtered = getFilteredRaces();

  if (!loaded) {
    return (
      <div className="bg-[#1a1a1a] text-white overflow-hidden" style={{ height: 32 }}>
        <div className="flex items-center h-full">
          <div className="shrink-0 px-3 text-[11px] font-bold text-[#f47920] uppercase tracking-wide border-r border-gray-700">
            Next to Jump
          </div>
          <div className="px-4 text-[11px] text-gray-500 animate-pulse">Loading races...</div>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="bg-[#1a1a1a] text-white overflow-hidden" style={{ height: 32 }}>
        <div className="flex items-center h-full">
          <div className="shrink-0 px-3 text-[11px] font-bold text-[#f47920] uppercase tracking-wide border-r border-gray-700">
            Next to Jump
          </div>
          <div className="px-4 text-[11px] text-gray-500">No upcoming races</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] text-white overflow-hidden" style={{ height: 32 }}>
      <div className="flex items-center h-full">
        <div className="shrink-0 px-3 text-[11px] font-bold text-[#f47920] uppercase tracking-wide border-r border-gray-700">
          Next to Jump
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...filtered, ...filtered].map((race, i) => {
              const diff = new Date(race.startTime).getTime() - now;
              const isLive = diff <= 0;
              const countdown = formatCountdown(diff);
              return (
                <div key={i} className="flex items-center gap-1.5 px-4 text-[11px] shrink-0">
                  <span>{iconMap[race.type]}</span>
                  <span className="text-gray-300">{race.track}</span>
                  <span className="text-gray-500">{race.race}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isLive
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-[#333] text-[#f47920]'
                    }`}
                  >
                    {countdown}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
