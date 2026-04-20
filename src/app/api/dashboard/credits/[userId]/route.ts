import { NextResponse } from 'next/server';
import { fetchCreditBalance } from '@orchestrators/dashboard/dashboardOrchestrator';
import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = decodeURIComponent(params.userId).trim().toLowerCase();
  if (!userId) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  if (userId !== session.email) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const result = await fetchCreditBalance(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'fetch_failed', message: (err as Error).message }, { status: 502 });
  }
}
