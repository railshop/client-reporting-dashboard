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
  const dataSourceId = url.searchParams.get('dataSourceId');

  if (!dataSourceId) {
    return jsonResponse({ error: 'dataSourceId is required' }, 400);
  }

  const filters = await sql`
    SELECT id, data_source_id, filter_type, filter_value, label, active
    FROM source_filters
    WHERE data_source_id = ${dataSourceId}
    ORDER BY label ASC NULLS LAST, filter_value ASC
  `;

  return jsonResponse({ filters });
};
