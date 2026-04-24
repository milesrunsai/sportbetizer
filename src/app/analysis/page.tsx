'use client';

import { useEffect, useState } from 'react';
import EventAnalysisCard from '@/components/EventAnalysisCard';
import SportFilter from '@/components/SportFilter';
import type { AnalyzedEvent } from '@/lib/types';

export default function AnalysisPage() {
  const [analyzed, setAnalyzed] = useState<AnalyzedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');

  useEffect(() => {
    fetch('/api/analyze')
      .then((r) => r.json())
      .then((data) => {
        setAnalyzed(data.analyzed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sports = [...new Set(analyzed.map((a) => a.event.sport))];

  const filtered =
    selectedSport === 'All'
      ? analyzed
      : analyzed.filter((a) => a.event.sport === selectedSport);

  const consensusCount = filtered.filter((a) => a.consensus === 'AGREE').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Today&apos;s Analysis</h1>
        <p className="text-sm text-slate-500">
          {analyzed.length} events analyzed / {consensusCount} consensus picks
        </p>
      </div>

      <div className="mb-6">
        <SportFilter
          selected={selectedSport}
          onChange={setSelectedSport}
          sports={sports}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1a2e] border border-[#2d2d50] rounded-xl h-48 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((analysis) => (
            <EventAnalysisCard key={analysis.event.id} analysis={analysis} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          No events found for this sport today.
        </div>
      )}
    </div>
  );
}
