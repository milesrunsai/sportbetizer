'use client';

import ModelIcon from './ModelIcon';
import type { AnalyzedEvent } from '@/lib/types';

interface EventAnalysisCardProps {
  analysis: AnalyzedEvent;
}

export default function EventAnalysisCard({ analysis }: EventAnalysisCardProps) {
  const { event, claudePick, gptPick, geminiPick, consensus, consensusPick, confidenceLevel } = analysis;

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#666] bg-[#f5f5f5] px-2 py-0.5 rounded border border-[#e5e5e5]">
              {event.sport}
            </span>
            <span className="text-[10px] text-[#999]">
              {new Date(event.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-[#333] mt-1">{event.event}</div>
          <div className="text-[11px] text-[#666] mt-0.5">{event.venue}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              consensus === 'AGREE'
                ? 'bg-[#00a651]/10 text-[#00a651]'
                : 'bg-[#004a99]/10 text-[#004a99]'
            }`}
          >
            {consensus}
          </span>
          {confidenceLevel !== 'low' && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded ${
                confidenceLevel === 'high'
                  ? 'bg-[#c8a415]/10 text-[#c8a415]'
                  : 'bg-[#004a99]/10 text-[#004a99]'
              }`}
            >
              {confidenceLevel} confidence
            </span>
          )}
        </div>
      </div>

      {/* Odds Buttons */}
      <div className="px-4 py-2 bg-[#f9f9f9] flex flex-wrap gap-2">
        {Object.entries(event.odds).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="text-[10px] text-[#666] truncate max-w-[80px] mb-0.5">{key}</div>
            <button className={`odds-btn text-[12px] ${consensusPick === key ? 'active' : ''}`}>
              {value.toFixed(2)}
            </button>
          </div>
        ))}
      </div>

      {/* Model picks */}
      <div className="divide-y divide-[#f0f0f0]">
        {[
          { model: 'claude' as const, pick: claudePick },
          { model: 'gpt' as const, pick: gptPick },
          { model: 'gemini' as const, pick: geminiPick },
        ].map(({ model, pick }) => (
          <div key={model} className="px-4 py-2.5 flex gap-2.5">
            <div className="shrink-0 pt-0.5">
              <ModelIcon model={model} agrees={pick.pick === consensusPick} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#333]">{pick.pick}</span>
                <span className="text-[10px] text-[#999]">({pick.confidence}/10)</span>
              </div>
              <p className="text-[11px] text-[#666] mt-0.5 leading-relaxed">{pick.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
