import { getBankroll, getResults } from '@/lib/db';
import ResultsClient from './ResultsClient';
import type { BankrollData, ResultEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

const fallbackBankroll: BankrollData = {
  startingBalance: 100,
  currentBalance: 100,
  history: [],
};

export default async function ResultsPage() {
  let bankroll: BankrollData = fallbackBankroll;
  let results: ResultEntry[] = [];

  try {
    bankroll = await getBankroll();
  } catch {
    // DB not configured yet
  }

  try {
    results = await getResults();
  } catch {
    // DB not configured yet
  }

  return <ResultsClient bankroll={bankroll} results={results} />;
}
