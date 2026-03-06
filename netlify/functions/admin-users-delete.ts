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

  const url = new URL(request.url);
  const userId = url.searchParams.get('id');

  if (!userId) {
    return jsonResponse({ error: 'id query param is required' }, 400);
  }

  if (userId === payload.userId) {
    return jsonResponse({ error: 'Cannot delete your own account' }, 400);
  }

  const result = await sql`DELETE FROM users WHERE id = ${userId} RETURNING id`;
  if (result.length === 0) {
    return jsonResponse({ error: 'User not found' }, 404);
  }

  return jsonResponse({ ok: true });
};
