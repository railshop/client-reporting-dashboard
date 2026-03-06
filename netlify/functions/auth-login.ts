import bcrypt from 'bcryptjs';
import { sql } from './_shared/db';
import { signToken, jsonResponse } from './_shared/auth-middleware';
import type { Context } from '@netlify/functions';

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role, u.password_hash, u.client_id, c.slug as client_slug
    FROM users u
    LEFT JOIN clients c ON u.client_id = c.id
    WHERE u.email = ${email}
  `;

  if (rows.length === 0) {
    return jsonResponse({ error: 'Invalid email or password' }, 401);
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return jsonResponse({ error: 'Invalid email or password' }, 401);
  }

  // Update last login
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;

  const token = signToken({
    userId: user.id,
    role: user.role,
    clientId: user.client_id,
    clientSlug: user.client_slug,
  });

  return jsonResponse({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientSlug: user.client_slug,
    },
  });
};
