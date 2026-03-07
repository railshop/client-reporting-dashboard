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

  const url = new URL(request.url);
  const clientSlug = url.searchParams.get('client');
  if (!clientSlug) {
    return jsonResponse({ error: 'client query param required' }, 400);
  }

  const clients = await sql`
    SELECT id, slug, name, logo_url, active, created_at
    FROM clients WHERE slug = ${clientSlug}
  `;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const client = clients[0];

  // Get data sources with has_credentials flag (never expose secrets)
  const sources = await sql`
    SELECT id, source, config, active, created_at
    FROM client_data_sources
    WHERE client_id = ${client.id}
    ORDER BY source
  `;

  const sourcesWithFlag = sources.map((s: any) => {
    const config = s.config || {};
    return {
      id: s.id,
      source: s.source,
      active: s.active,
      has_credentials: !!config.credentials_encrypted,
      // Return non-secret identifiers only
      identifiers: Object.fromEntries(
        Object.entries(config).filter(([k]) => k !== 'credentials_encrypted')
      ),
      created_at: s.created_at,
    };
  });

  return jsonResponse({
    client: {
      id: client.id,
      slug: client.slug,
      name: client.name,
      logo_url: client.logo_url,
      active: client.active,
      created_at: client.created_at,
    },
    sources: sourcesWithFlag,
  });
};
