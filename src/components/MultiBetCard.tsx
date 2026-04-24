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
    <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#003f7f] px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-white/60 uppercase tracking-wider">Daily Multi</div>
          <div className="text-[13px] text-white font-medium">
            {new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {result && (
          <span
            className={`text-[11px] font-bold px-3 py-1 rounded-full ${
              result === 'won'
                ? 'bg-[#00a651] text-white'
                : result === 'lost'
                  ? 'bg-[#d32f2f] text-white'
                  : 'bg-white/20 text-white'
            }`}
          >
            {result === 'pending' ? 'PENDING' : result.toUpperCase()}
          </span>
        )}
      </div>

      {/* Legs */}
      <div className="divide-y divide-[#f0f0f0]">
        {legs.map((leg, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center gap-3">
            <div className="shrink-0">
              <span className="text-[10px] font-bold text-[#666] bg-[#f5f5f5] px-2 py-1 rounded border border-[#e5e5e5]">
                {sportTag(leg.event.sport)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#333] truncate">{leg.event.event}</div>
              <div className="text-[12px] text-[#004a99] font-semibold mt-0.5">{leg.pick}</div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <ConsensusBar
                claudeAgrees={leg.claudeAgrees}
                gptAgrees={leg.gptAgrees}
                geminiAgrees={leg.geminiAgrees}
                size="sm"
              />
              <span className="odds-btn">{leg.odds.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#f9f9f9] px-4 py-3 border-t border-[#e5e5e5]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] text-[#999] uppercase tracking-wider">Combined Odds</div>
            <div className="text-[18px] font-black text-[#f47920]">{combinedOdds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#999] uppercase tracking-wider">Stake</div>
            <div className="text-[18px] font-black text-[#333]">${recommendedStake.toFixed(2)}</div>
            <div className="text-[10px] text-[#999]">{((recommendedStake / bankroll) * 100).toFixed(0)}% of bankroll</div>
          </div>
          <div>
            <div className="text-[10px] text-[#999] uppercase tracking-wider">Potential Return</div>
            <div className="text-[18px] font-black text-[#00a651]">${potentialReturn.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
