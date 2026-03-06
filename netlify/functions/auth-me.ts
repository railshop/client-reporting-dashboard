import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
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

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role, u.client_id, c.slug as client_slug
    FROM users u
    LEFT JOIN clients c ON u.client_id = c.id
    WHERE u.id = ${payload.userId}
  `;

  if (rows.length === 0) return unauthorized('User not found');

  const user = rows[0];

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientSlug: user.client_slug,
    },
  });
};
