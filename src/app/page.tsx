import { getBankroll, getResults } from '@/lib/db';
import LandingClient from './LandingClient';
import type { BankrollData, ResultEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

const fallbackBankroll: BankrollData = {
  startingBalance: 100,
  currentBalance: 100,
  history: [],
};

export default async function Home() {
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

  return <LandingClient bankroll={bankroll} results={results} />;
}
