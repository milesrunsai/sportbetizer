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
  const highConfCount = filtered.filter((a) => a.confidenceLevel === 'high').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#333]">AI Picks &amp; Analysis</h1>
          <p className="text-[12px] text-[#666] mt-0.5">
            {analyzed.length} events analyzed &middot; {consensusCount} consensus picks &middot; {highConfCount} high confidence
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#666]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00a651]"></span>
            Consensus
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#c8a415]"></span>
            High Conf
          </span>
        </div>
      </div>

      <div className="mb-4">
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
              className="bg-white border border-[#e5e5e5] rounded-lg h-48 animate-pulse"
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
        <div className="text-center py-12 text-[#999] text-[13px]">
          No events found for this sport today.
        </div>
      )}
    </div>
  );
}
