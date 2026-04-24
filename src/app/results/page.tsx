import { getBankroll, getResults } from '@/lib/data';
import ResultsClient from './ResultsClient';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const bankroll = await getBankroll();
  const results = await getResults();

  return <ResultsClient bankroll={bankroll} results={results} />;
}
