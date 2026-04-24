import { getBankroll, getResults } from '@/lib/db';
import LandingClient from './LandingClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const bankroll = await getBankroll();
  const results = await getResults();

  return <LandingClient bankroll={bankroll} results={results} />;
}
