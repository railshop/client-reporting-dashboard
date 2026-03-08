import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { getDecryptedCredentials, getSourceFilters } from './_shared/data-pull-utils';
import { pullGA4 } from './_shared/pulls/ga4';
import { pullGSC } from './_shared/pulls/gsc';
import { pullGoogleAds } from './_shared/pulls/google-ads';
import { pullMeta } from './_shared/pulls/meta';
import { pullGBP } from './_shared/pulls/gbp';
import type { SourceFilter } from '../../src/shared/schemas/filters';
import type { Context } from '@netlify/functions';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

const pullFunctions: Partial<Record<SourceType, (creds: Record<string, string>, periodStart: string, filters?: SourceFilter[]) => Promise<any>>> = {
  ga4: pullGA4,
  gsc: pullGSC,
  google_ads: pullGoogleAds,
  meta: pullMeta,
  gbp: pullGBP,
};

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
  const { clientSlug, periodStart, sources: requestedSources } = body;

  if (!clientSlug || !periodStart) {
    return jsonResponse({ error: 'clientSlug and periodStart required' }, 400);
  }

  // Get client
  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;

  // Get active configured sources for this client
  const allSources = await sql`
    SELECT source FROM client_data_sources
    WHERE client_id = ${clientId} AND active = true
  `;

  // Filter to requested sources if specified
  const sourcesToPull: SourceType[] = allSources
    .map((s) => s.source as SourceType)
    .filter((s) => !requestedSources || requestedSources.includes(s));

  const results: Record<string, { status: string; error?: string }> = {};

  for (const source of sourcesToPull) {
    const pullFn = pullFunctions[source];
    if (!pullFn) {
      results[source] = { status: 'skipped', error: 'No API pull available' };
      continue;
    }

    try {
      const creds = await getDecryptedCredentials(clientSlug, source);
      if (!creds) {
        results[source] = { status: 'skipped', error: 'No credentials configured' };
        continue;
      }

      const filters = await getSourceFilters(clientSlug, source);
      const data = await pullFn(creds, periodStart, filters);

      // Write raw data to raw_ingestions (UPSERT)
      await sql`
        INSERT INTO raw_ingestions (client_id, source, period_start, raw_data, metadata)
        VALUES (
          ${clientId},
          ${source},
          ${periodStart},
          ${JSON.stringify(data.raw)}::jsonb,
          ${JSON.stringify({ pulledAt: new Date().toISOString(), source })}::jsonb
        )
        ON CONFLICT (client_id, source, period_start)
        DO UPDATE SET
          raw_data = ${JSON.stringify(data.raw)}::jsonb,
          metadata = ${JSON.stringify({ pulledAt: new Date().toISOString(), source })}::jsonb
      `;

      results[source] = { status: 'success' };
    } catch (err: any) {
      results[source] = { status: 'error', error: err.message || 'Unknown error' };
    }
  }

  return jsonResponse({ results });
};
