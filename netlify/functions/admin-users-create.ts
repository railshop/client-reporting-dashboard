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
  if (request.method !== 'POST') {
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
  const { email, name, role, clientId, password } = body as {
    email?: string;
    name?: string;
    role?: string;
    clientId?: string | null;
    password?: string;
  };

  if (!email || !name || !role || !password) {
    return jsonResponse({ error: 'email, name, role, and password are required' }, 400);
  }
  if (!['admin', 'client'].includes(role)) {
    return jsonResponse({ error: 'role must be admin or client' }, 400);
  }
  if (role === 'client' && !clientId) {
    return jsonResponse({ error: 'clientId is required for client role' }, 400);
  }
  if (password.length < 8) {
    return jsonResponse({ error: 'password must be at least 8 characters' }, 400);
  }

  // Check for duplicate email
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return jsonResponse({ error: 'A user with this email already exists' }, 409);
  }

  const hash = await bcrypt.hash(password, 12);

  const [user] = await sql`
    INSERT INTO users (email, name, role, client_id, password_hash)
    VALUES (${email}, ${name}, ${role}, ${clientId ?? null}, ${hash})
    RETURNING id, email, name, role, client_id
  `;

  return jsonResponse({ user }, 201);
};
