import { getBankroll, getResults } from '@/lib/data';
import type { ResultEntry } from '@/lib/types';
import LandingClient from './LandingClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const bankroll = await getBankroll();
  const results = await getResults();

  return <LandingClient bankroll={bankroll} results={results} />;
}
