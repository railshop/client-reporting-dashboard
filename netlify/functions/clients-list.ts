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
  if (payload.role !== 'admin') return forbidden();

  const clients = await sql`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.active,
      rp.period_start  AS last_period_start,
      rp.status        AS last_period_status,
      rp.published_at  AS last_published_at
    FROM clients c
    LEFT JOIN LATERAL (
      SELECT period_start, status, published_at
      FROM report_periods
      WHERE client_id = c.id
      ORDER BY period_start DESC
      LIMIT 1
    ) rp ON true
    WHERE c.active = true
    ORDER BY c.name
  `;

  return jsonResponse({ clients });
};
