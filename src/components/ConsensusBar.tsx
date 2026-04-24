'use client';

import ModelIcon from './ModelIcon';

interface ConsensusBarProps {
  claudeAgrees: boolean;
  gptAgrees: boolean;
  geminiAgrees: boolean;
  size?: 'sm' | 'md';
}

export default function ConsensusBar({ claudeAgrees, gptAgrees, geminiAgrees, size = 'md' }: ConsensusBarProps) {
  const count = [claudeAgrees, gptAgrees, geminiAgrees].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        <ModelIcon model="claude" agrees={claudeAgrees} size={size} />
        <ModelIcon model="gpt" agrees={gptAgrees} size={size} />
        <ModelIcon model="gemini" agrees={geminiAgrees} size={size} />
      </div>
      {size === 'md' && (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${
            count === 3
              ? 'bg-[#E8A838]/20 text-[#E8A838]'
              : count === 2
                ? 'bg-[#4A9EE8]/20 text-[#4A9EE8]'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          {count}/3
        </span>
      )}
    </div>
  );
}
