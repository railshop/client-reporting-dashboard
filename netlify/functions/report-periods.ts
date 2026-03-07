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
  const token = getTokenFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  if (!token) return unauthorized();

  const payload = verifyToken(token);
  if (!payload) return unauthorized('Invalid or expired token');

  const url = new URL(request.url);
  const clientSlug = url.searchParams.get('client');

  if (!clientSlug) {
    return jsonResponse({ error: 'client query param required' }, 400);
  }

  // Client users can only see their own data
  if (payload.role === 'client' && payload.clientSlug !== clientSlug) {
    return forbidden();
  }

  // Client users can only see published periods
  const rows = payload.role === 'client'
    ? await sql`
        SELECT rp.id, rp.period_start, rp.status, rp.published_at, rp.created_at
        FROM report_periods rp
        JOIN clients c ON rp.client_id = c.id
        WHERE c.slug = ${clientSlug} AND rp.status = 'published'
        ORDER BY rp.period_start DESC
      `
    : await sql`
        SELECT rp.id, rp.period_start, rp.status, rp.published_at, rp.created_at
        FROM report_periods rp
        JOIN clients c ON rp.client_id = c.id
        WHERE c.slug = ${clientSlug}
        ORDER BY rp.period_start DESC
      `;

  return jsonResponse({ periods: rows });
};
