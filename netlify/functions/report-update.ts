import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { overviewSchema } from '../../src/shared/schemas/common';
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
  const { reportPeriodId, overview, railshop_notes, next_priorities } = body;

  if (!reportPeriodId) {
    return jsonResponse({ error: 'reportPeriodId required' }, 400);
  }

  // Validate overview if provided
  if (overview !== undefined) {
    const parsed = overviewSchema.safeParse(overview);
    if (!parsed.success) {
      return jsonResponse(
        { error: 'Invalid overview data', details: parsed.error.flatten().fieldErrors },
        400
      );
    }
  }

  const result = await sql`
    UPDATE report_periods
    SET
      overview = COALESCE(${overview !== undefined ? JSON.stringify(overview) : null}::jsonb, overview),
      railshop_notes = COALESCE(${railshop_notes ?? null}, railshop_notes),
      next_priorities = COALESCE(${next_priorities ?? null}, next_priorities),
      updated_at = now()
    WHERE id = ${reportPeriodId}
    RETURNING id, period_start, status, overview, railshop_notes, next_priorities, updated_at
  `;

  if (result.length === 0) {
    return jsonResponse({ error: 'Report period not found' }, 404);
  }

  return jsonResponse({ period: result[0] });
};
