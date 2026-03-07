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
  if (request.method !== 'DELETE') {
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
  const { reportPeriodId } = body;

  if (!reportPeriodId) {
    return jsonResponse({ error: 'reportPeriodId required' }, 400);
  }

  const result = await sql`
    DELETE FROM report_periods WHERE id = ${reportPeriodId} RETURNING id
  `;

  if (result.length === 0) {
    return jsonResponse({ error: 'Report not found' }, 404);
  }

  return jsonResponse({ deleted: true });
};
