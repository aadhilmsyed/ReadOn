import { NextResponse } from 'next/server';
import { fetchAggregatedHistory } from '@orchestrators/dashboard/dashboardOrchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 5;

  try {
    const history = await fetchAggregatedHistory(limit);
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: 'aggregation_failed', message: (err as Error).message }, { status: 502 });
  }
}
