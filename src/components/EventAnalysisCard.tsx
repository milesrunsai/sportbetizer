'use client';

import ModelIcon from './ModelIcon';
import type { AnalyzedEvent } from '@/lib/types';

interface EventAnalysisCardProps {
  analysis: AnalyzedEvent;
}

export default function EventAnalysisCard({ analysis }: EventAnalysisCardProps) {
  const { event, claudePick, gptPick, geminiPick, consensus, consensusPick, confidenceLevel } = analysis;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
              {event.sport}
            </span>
            <span className="text-[10px] text-zinc-600">
              {new Date(event.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-sm font-semibold text-zinc-200 mt-1">{event.event}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{event.venue}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              consensus === 'AGREE'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {consensus}
          </span>
          {confidenceLevel !== 'low' && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded ${
                confidenceLevel === 'high'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
              {confidenceLevel} confidence
            </span>
          )}
        </div>
      </div>

      {/* Odds */}
      <div className="px-4 py-2 bg-zinc-800/30 flex flex-wrap gap-3">
        {Object.entries(event.odds).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="text-[10px] text-zinc-500 truncate max-w-[80px]">{key}</div>
            <div className={`text-sm font-bold ${consensusPick === key ? 'text-green-400' : 'text-zinc-300'}`}>
              {value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Model picks */}
      <div className="divide-y divide-zinc-800/50">
        {[
          { model: 'claude' as const, pick: claudePick },
          { model: 'gpt' as const, pick: gptPick },
          { model: 'gemini' as const, pick: geminiPick },
        ].map(({ model, pick }) => (
          <div key={model} className="px-4 py-3 flex gap-3">
            <div className="shrink-0 pt-0.5">
              <ModelIcon model={model} agrees={pick.pick === consensusPick} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">{pick.pick}</span>
                <span className="text-[10px] text-zinc-600">({pick.confidence}/10)</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{pick.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
