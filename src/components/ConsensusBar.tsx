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
              ? 'bg-green-500/20 text-green-400'
              : count === 2
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          {count}/3
        </span>
      )}
    </div>
  );
}
