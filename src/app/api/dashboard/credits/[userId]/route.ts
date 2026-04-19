import { NextResponse } from 'next/server';
import { fetchCreditBalance } from '@orchestrators/dashboard/dashboardOrchestrator';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { userId: string } }) {
  const userId = decodeURIComponent(params.userId).trim();
  if (!userId) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  try {
    const result = await fetchCreditBalance(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'fetch_failed', message: (err as Error).message }, { status: 502 });
  }
}
