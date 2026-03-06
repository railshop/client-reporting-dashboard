import bcrypt from 'bcryptjs';
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
  const { id, email, name, role, clientId, password } = body as {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    clientId?: string | null;
    password?: string;
  };

  if (!id) {
    return jsonResponse({ error: 'id is required' }, 400);
  }
  if (!email || !name || !role) {
    return jsonResponse({ error: 'email, name, and role are required' }, 400);
  }
  if (!['admin', 'client'].includes(role)) {
    return jsonResponse({ error: 'role must be admin or client' }, 400);
  }
  if (role === 'client' && !clientId) {
    return jsonResponse({ error: 'clientId is required for client role' }, 400);
  }
  if (password && password.length < 8) {
    return jsonResponse({ error: 'password must be at least 8 characters' }, 400);
  }

  // Check for duplicate email (excluding this user)
  const existing = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${id}`;
  if (existing.length > 0) {
    return jsonResponse({ error: 'A user with this email already exists' }, 409);
  }

  if (password) {
    const hash = await bcrypt.hash(password, 12);
    const [user] = await sql`
      UPDATE users
      SET email = ${email}, name = ${name}, role = ${role},
          client_id = ${role === 'client' ? clientId : null},
          password_hash = ${hash}
      WHERE id = ${id}
      RETURNING id, email, name, role, client_id
    `;
    if (!user) return jsonResponse({ error: 'User not found' }, 404);
    return jsonResponse({ user });
  } else {
    const [user] = await sql`
      UPDATE users
      SET email = ${email}, name = ${name}, role = ${role},
          client_id = ${role === 'client' ? clientId : null}
      WHERE id = ${id}
      RETURNING id, email, name, role, client_id
    `;
    if (!user) return jsonResponse({ error: 'User not found' }, 404);
    return jsonResponse({ user });
  }
};
