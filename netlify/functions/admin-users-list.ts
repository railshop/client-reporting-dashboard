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

  const users = await sql`
    SELECT
      u.id,
      u.email,
      u.name,
      u.role,
      u.client_id,
      u.created_at,
      u.last_login_at,
      c.name AS client_name,
      c.slug AS client_slug
    FROM users u
    LEFT JOIN clients c ON u.client_id = c.id
    ORDER BY u.role DESC, u.name
  `;

  return jsonResponse({ users });
};
