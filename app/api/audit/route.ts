import { getUserIdFromSession } from '@/lib/session';
import { auditLog } from '@/lib/audit-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns the server-side hash-chained audit entries for the caller's tenant.
 *
 * The browser keeps its own chain (for USER actions and sandbox mutations); this route
 * lets the client merge the AGENT tool-invocation entries the server recorded during
 * /api/chat and /api/proposals so the Audit Drawer shows ONE unified chain.
 */
export async function GET(req: Request) {
  const userId = getUserIdFromSession(req);
  return Response.json(
    { userId, entries: auditLog.list(userId) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
