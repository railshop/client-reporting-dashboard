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

  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }

  const ingestions = await sql`
    SELECT id, source, raw_data, metadata, created_at
    FROM raw_ingestions
    WHERE client_id = ${clients[0].id} AND period_start = ${periodStart}
    ORDER BY source
  `;

  return jsonResponse({ ingestions });
};
