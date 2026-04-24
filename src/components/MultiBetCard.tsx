'use client';

import ConsensusBar from './ConsensusBar';
import type { MultiLeg } from '@/lib/types';

interface MultiBetCardProps {
  date: string;
  legs: MultiLeg[];
  combinedOdds: number;
  recommendedStake: number;
  bankroll: number;
  result?: 'won' | 'lost' | 'pending';
}

function sportTag(sport: string): string {
  const map: Record<string, string> = {
    'AFL': 'AFL',
    'NRL': 'NRL',
    'NBA': 'NBA',
    'UFC': 'UFC',
    'Horse Racing': 'RACE',
    'Greyhounds': 'DOGS',
    'Soccer': 'SOCCER',
  };
  return map[sport] || sport.toUpperCase();
}

export default function MultiBetCard({ date, legs, combinedOdds, recommendedStake, bankroll, result }: MultiBetCardProps) {
  const potentialReturn = combinedOdds * recommendedStake;

  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d50] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#252540] px-4 py-3 flex items-center justify-between border-b border-[#2d2d50]">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Daily Multi</div>
          <div className="text-sm text-slate-300 font-medium">
            {new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {result && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              result === 'won'
                ? 'bg-[#E8A838]/20 text-[#E8A838] border border-[#E8A838]/30'
                : result === 'lost'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[#4A9EE8]/20 text-[#4A9EE8] border border-[#4A9EE8]/30'
            }`}
          >
            {result === 'pending' ? 'PENDING' : result.toUpperCase()}
          </span>
        )}
      </div>

      {/* Legs */}
      <div className="divide-y divide-[#2d2d50]/50">
        {legs.map((leg, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="shrink-0">
              <span className="text-[10px] font-bold text-slate-500 bg-[#252540] px-2 py-1 rounded border border-[#2d2d50]">
                {sportTag(leg.event.sport)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{leg.event.event}</div>
              <div className="text-xs text-[#4A9EE8] font-semibold mt-0.5">{leg.pick}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-[#E8A838]">{leg.odds.toFixed(2)}</div>
              <ConsensusBar
                claudeAgrees={leg.claudeAgrees}
                gptAgrees={leg.gptAgrees}
                geminiAgrees={leg.geminiAgrees}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#252540]/50 px-4 py-3 border-t border-[#2d2d50]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Combined Odds</div>
            <div className="text-lg font-bold text-[#E8A838]">{combinedOdds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stake</div>
            <div className="text-lg font-bold text-white">${recommendedStake.toFixed(2)}</div>
            <div className="text-[10px] text-slate-600">{((recommendedStake / bankroll) * 100).toFixed(0)}% of bankroll</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Potential Return</div>
            <div className="text-lg font-bold text-[#E8A838]">${potentialReturn.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
