import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { encrypt } from './_shared/crypto';
import { credentialSchemaMap, type SourceType } from '../../src/shared/schemas/credentials';
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
  const { clientSlug, source, credentials, active } = body;

  if (!clientSlug || !source) {
    return jsonResponse({ error: 'clientSlug and source are required' }, 400);
  }

  const validSources = Object.keys(credentialSchemaMap);
  if (!validSources.includes(source)) {
    return jsonResponse({ error: `Invalid source: ${source}` }, 400);
  }

  // Get client ID
  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;

  // Build config JSONB
  const config: Record<string, string> = {};

  if (credentials && Object.keys(credentials).length > 0) {
    // Validate credentials against schema
    const schema = credentialSchemaMap[source as SourceType];
    const parsed = schema.safeParse(credentials);
    if (!parsed.success) {
      return jsonResponse(
        { error: 'Invalid credentials', details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    // Encrypt the full credentials object
    config.credentials_encrypted = encrypt(JSON.stringify(parsed.data));

    // Store non-secret identifiers in plaintext for display
    const { CREDENTIAL_FIELDS } = await import('../../src/shared/schemas/credentials');
    const fields = CREDENTIAL_FIELDS[source as SourceType];
    for (const [key, def] of Object.entries(fields)) {
      if (!def.secret && parsed.data[key as keyof typeof parsed.data]) {
        config[key] = String(parsed.data[key as keyof typeof parsed.data]);
      }
    }
  }

  // Upsert the data source
  const result = await sql`
    INSERT INTO client_data_sources (client_id, source, config, active)
    VALUES (${clientId}, ${source}, ${JSON.stringify(config)}, ${active ?? true})
    ON CONFLICT (client_id, source)
    DO UPDATE SET
      config = CASE
        WHEN ${Object.keys(config).length > 0} THEN ${JSON.stringify(config)}::jsonb
        ELSE client_data_sources.config
      END,
      active = COALESCE(${active ?? null}, client_data_sources.active)
    RETURNING id, source, active
  `;

  return jsonResponse({ source: result[0] });
};
