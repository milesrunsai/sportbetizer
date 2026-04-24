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
              ? 'bg-green-500 text-black'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
          }`}
        >
          {sportLabels[sport] || sport}
        </button>
      ))}
    </div>
  );
}
