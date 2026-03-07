import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import type { Context } from '@netlify/functions';

interface FilterInput {
  filter_type: string;
  filter_value: string;
  label?: string;
  active?: boolean;
}

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
  const { dataSourceId, filters } = body as {
    dataSourceId: string;
    filters: FilterInput[];
  };

  if (!dataSourceId || !Array.isArray(filters)) {
    return jsonResponse({ error: 'dataSourceId and filters[] are required' }, 400);
  }

  // Verify the data source exists
  const ds = await sql`SELECT id FROM client_data_sources WHERE id = ${dataSourceId}`;
  if (ds.length === 0) {
    return jsonResponse({ error: 'Data source not found' }, 404);
  }

  // Upsert each filter
  const results = [];
  for (const f of filters) {
    if (!f.filter_type || !f.filter_value) continue;

    const rows = await sql`
      INSERT INTO source_filters (data_source_id, filter_type, filter_value, label, active)
      VALUES (${dataSourceId}, ${f.filter_type}, ${f.filter_value}, ${f.label || null}, ${f.active ?? true})
      ON CONFLICT (data_source_id, filter_type, filter_value)
      DO UPDATE SET
        label = COALESCE(${f.label || null}, source_filters.label),
        active = ${f.active ?? true}
      RETURNING id, filter_type, filter_value, label, active
    `;
    results.push(rows[0]);
  }

  return jsonResponse({ filters: results });
};
