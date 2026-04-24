'use client';

import type { Sport } from '@/lib/types';

interface SportFilterProps {
  selected: string;
  onChange: (sport: string) => void;
  sports: string[];
}

const sportLabels: Record<string, string> = {
  All: 'All',
  AFL: 'AFL',
  NRL: 'NRL',
  NBA: 'NBA',
  UFC: 'UFC',
  'Horse Racing': 'Racing',
  Greyhounds: 'Dogs',
  Soccer: 'Soccer',
  Other: 'Other',
};

export default function SportFilter({ selected, onChange, sports }: SportFilterProps) {
  const tabs = ['All', ...sports];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {tabs.map((sport) => (
        <button
          key={sport}
          onClick={() => onChange(sport)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selected === sport
              ? 'bg-[#4A9EE8] text-[#0f0f23]'
              : 'bg-[#1a1a2e] text-slate-400 hover:bg-[#252540] hover:text-slate-300 border border-[#2d2d50]'
          }`}
        >
          {sportLabels[sport] || sport}
        </button>
      ))}
    </div>
  );
}
