'use client';

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
          className={`px-4 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition-all border ${
            selected === sport
              ? 'bg-[#f47920] text-white border-[#f47920]'
              : 'bg-white text-[#666] hover:bg-[#f9f9f9] hover:text-[#333] border-[#e5e5e5]'
          }`}
        >
          {sportLabels[sport] || sport}
        </button>
      ))}
    </div>
  );
}
