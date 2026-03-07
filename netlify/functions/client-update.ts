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
  const { clientSlug, name, logo_url, active } = body;

  if (!clientSlug) {
    return jsonResponse({ error: 'clientSlug is required' }, 400);
  }

  const updated = await sql`
    UPDATE clients
    SET
      name = COALESCE(${name ?? null}, name),
      logo_url = COALESCE(${logo_url ?? null}, logo_url),
      active = COALESCE(${active ?? null}, active)
    WHERE slug = ${clientSlug}
    RETURNING id, slug, name, logo_url, active
  `;

  if (updated.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }

  return jsonResponse({ client: updated[0] });
};
