export type Sport = 'AFL' | 'NRL' | 'NBA' | 'UFC' | 'Horse Racing' | 'Greyhounds' | 'Soccer' | 'Other';

export interface SportEvent {
  id: string;
  sport: Sport;
  event: string;
  teams: string[];
  odds: Record<string, number>;
  startTime: string;
  venue: string;
}

export interface ModelPick {
  pick: string;
  reasoning: string;
  confidence: number;
}

export interface AnalyzedEvent {
  event: SportEvent;
  claudePick: ModelPick;
  gptPick: ModelPick;
  geminiPick: ModelPick;
  consensus: 'AGREE' | 'SPLIT';
  consensusPick: string | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  agreementCount: number;
}

export interface MultiLeg {
  event: SportEvent;
  pick: string;
  odds: number;
  claudeAgrees: boolean;
  gptAgrees: boolean;
  geminiAgrees: boolean;
  confidenceLevel: 'high' | 'medium';
}

export interface DailyMulti {
  id: string;
  date: string;
  legs: MultiLeg[];
  combinedOdds: number;
  recommendedStake: number;
  result?: 'won' | 'lost' | 'pending';
  returnAmount?: number;
}

export interface BankrollData {
  startingBalance: number;
  currentBalance: number;
  history: { date: string; balance: number; change: number; reason: string }[];
}

export interface ResultEntry {
  id: string;
  date: string;
  legs: { event: string; pick: string; odds: number; result: 'won' | 'lost' }[];
  combinedOdds: number;
  stake: number;
  result: 'won' | 'lost';
  returnAmount: number;
  bankrollAfter: number;
}
