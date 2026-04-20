import { NextResponse } from 'next/server';
import { rechargeUserCredits } from '@orchestrators/dashboard/dashboardOrchestrator';
import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';

export const dynamic = 'force-dynamic';

interface Body { dollars?: number }

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = decodeURIComponent(params.userId).trim().toLowerCase();
  if (!userId) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  if (userId !== session.email) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const dollars = Number(body.dollars);
  if (!Number.isInteger(dollars) || dollars <= 0 || dollars > 1000) {
    return NextResponse.json({ error: 'invalid_dollars' }, { status: 400 });
  }

  try {
    const result = await rechargeUserCredits(userId, dollars);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'recharge_failed', message: (err as Error).message }, { status: 502 });
  }
}
