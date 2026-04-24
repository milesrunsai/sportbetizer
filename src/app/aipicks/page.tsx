import { getTodayAnalysis } from '@/lib/db';
import type { AnalyzedEvent } from '@/lib/types';
import AiPicksClient from './AiPicksClient';

export const dynamic = 'force-dynamic';

export default async function AiPicksPage() {
  const cachedAnalysis = await getTodayAnalysis().catch(() => null);
  const analyzed: AnalyzedEvent[] = cachedAnalysis?.analyzed || [];

  return <AiPicksClient events={[]} analyzed={analyzed} />;
}
