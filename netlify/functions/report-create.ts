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
  if (request.method !== 'POST') {
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
  const { clientSlug, periodStart } = body;

  if (!clientSlug || !periodStart) {
    return jsonResponse({ error: 'clientSlug and periodStart (YYYY-MM-DD) required' }, 400);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
    return jsonResponse({ error: 'periodStart must be YYYY-MM-DD format' }, 400);
  }

  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;

  // Check for existing period
  const existing = await sql`
    SELECT id, status FROM report_periods
    WHERE client_id = ${clientId} AND period_start = ${periodStart}
  `;
  if (existing.length > 0) {
    return jsonResponse({ error: 'Report period already exists', period: existing[0] }, 409);
  }

  const result = await sql`
    INSERT INTO report_periods (client_id, period_start, status, overview)
    VALUES (${clientId}, ${periodStart}, 'draft', '{}')
    RETURNING id, period_start, status, overview, created_at
  `;

  return jsonResponse({ period: result[0] }, 201);
};
