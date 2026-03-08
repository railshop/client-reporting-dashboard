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
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = getTokenFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  if (!token) return unauthorized();

  const payload = verifyToken(token);
  if (!payload) return unauthorized('Invalid or expired token');
  if (payload.role !== 'admin') return forbidden();

  const url = new URL(request.url);
  const clientSlug = url.searchParams.get('clientSlug');
  const periodStart = url.searchParams.get('periodStart');

  if (!clientSlug || !periodStart) {
    return jsonResponse({ error: 'clientSlug and periodStart required' }, 400);
  }

  const rows = await sql`
    SELECT rp.ai_status, rp.ai_error
    FROM report_periods rp
    JOIN clients c ON rp.client_id = c.id
    WHERE c.slug = ${clientSlug} AND rp.period_start = ${periodStart}
  `;

  if (rows.length === 0) {
    return jsonResponse({ ai_status: null, ai_error: null });
  }

  return jsonResponse({
    ai_status: rows[0].ai_status,
    ai_error: rows[0].ai_error,
  });
};
