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
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        <ModelIcon model="claude" agrees={claudeAgrees} size={size} />
        <ModelIcon model="gpt" agrees={gptAgrees} size={size} />
        <ModelIcon model="gemini" agrees={geminiAgrees} size={size} />
      </div>
      {size === 'md' && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            count === 3
              ? 'bg-[#00a651]/10 text-[#00a651]'
              : count === 2
                ? 'bg-[#004a99]/10 text-[#004a99]'
                : 'bg-[#d32f2f]/10 text-[#d32f2f]'
          }`}
        >
          {count}/3
        </span>
      )}
    </div>
  );
}
