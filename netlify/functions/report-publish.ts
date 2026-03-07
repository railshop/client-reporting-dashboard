import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import type { Context } from '@netlify/functions';

export default async (request: Request, _context: Context) => {
  if (request.method !== 'PUT') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = getTokenFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  if (!token) return unauthorized();

  const payload = verifyToken(token);
  if (!payload) return unauthorized('Invalid or expired token');
  if (payload.role !== 'admin') return forbidden();

  const body = await request.json();
  const { reportPeriodId, action } = body;

  if (!reportPeriodId || !['publish', 'unpublish'].includes(action)) {
    return jsonResponse({ error: 'reportPeriodId and action (publish|unpublish) required' }, 400);
  }

  const newStatus = action === 'publish' ? 'published' : 'draft';
  const publishedAt = action === 'publish' ? new Date().toISOString() : null;

  const result = await sql`
    UPDATE report_periods
    SET status = ${newStatus},
        published_at = ${publishedAt},
        updated_at = now()
    WHERE id = ${reportPeriodId}
    RETURNING id, status, published_at
  `;

  if (result.length === 0) {
    return jsonResponse({ error: 'Report period not found' }, 404);
  }

  return jsonResponse({ period: result[0] });
};
