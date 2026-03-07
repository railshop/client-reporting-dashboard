import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { getDecryptedCredentials } from './_shared/data-pull-utils';
import { pullGA4 } from './_shared/pulls/ga4';
import { pullGSC } from './_shared/pulls/gsc';
import { pullGoogleAds } from './_shared/pulls/google-ads';
import { pullMeta } from './_shared/pulls/meta';
import { pullServiceTitan } from './_shared/pulls/servicetitan';
import { pullGBP } from './_shared/pulls/gbp';
import type { Context } from '@netlify/functions';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

const pullFunctions: Partial<Record<SourceType, (creds: Record<string, string>, periodStart: string) => Promise<any>>> = {
  ga4: pullGA4,
  gsc: pullGSC,
  google_ads: pullGoogleAds,
  meta: pullMeta,
  servicetitan: pullServiceTitan,
  gbp: pullGBP,
  // lsa: no API — manual only
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
  const { clientSlug, periodStart } = body;

  if (!clientSlug || !periodStart) {
    return jsonResponse({ error: 'clientSlug and periodStart required' }, 400);
  }

  // Get client
  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;

  // Create or find draft report period
  let reportPeriod;
  const existing = await sql`
    SELECT id FROM report_periods
    WHERE client_id = ${clientId} AND period_start = ${periodStart}
  `;
  if (existing.length > 0) {
    reportPeriod = existing[0];
  } else {
    const created = await sql`
      INSERT INTO report_periods (client_id, period_start, status)
      VALUES (${clientId}, ${periodStart}, 'draft')
      RETURNING id
    `;
    reportPeriod = created[0];
  }

  // Get active configured sources for this client
  const sources = await sql`
    SELECT source, config
    FROM client_data_sources
    WHERE client_id = ${clientId} AND active = true
  `;

  const results: Record<string, { status: string; error?: string }> = {};

  for (const src of sources) {
    const source = src.source as SourceType;
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

      const data = await pullFn(creds, periodStart);

      // Upsert section
      const sectionResult = await sql`
        INSERT INTO report_sections (report_period_id, source, kpis, tables)
        VALUES (
          ${reportPeriod.id},
          ${source},
          ${JSON.stringify(data.kpis)}::jsonb,
          ${JSON.stringify(data.tables || {})}::jsonb
        )
        ON CONFLICT (report_period_id, source)
        DO UPDATE SET
          kpis = ${JSON.stringify(data.kpis)}::jsonb,
          tables = ${JSON.stringify(data.tables || {})}::jsonb,
          updated_at = now()
        RETURNING id
      `;

      // Upsert campaigns if present
      if (data.campaigns?.length) {
        const sectionId = sectionResult[0].id;
        await sql`DELETE FROM campaign_metrics WHERE report_section_id = ${sectionId}`;
        for (const c of data.campaigns) {
          await sql`
            INSERT INTO campaign_metrics (report_section_id, campaign_name, campaign_type, metrics)
            VALUES (${sectionId}, ${c.campaign_name}, ${c.campaign_type || null}, ${JSON.stringify(c.metrics)}::jsonb)
          `;
        }
      }

      results[source] = { status: 'success' };
    } catch (err: any) {
      results[source] = { status: 'error', error: err.message || 'Unknown error' };
    }
  }

  return jsonResponse({ reportPeriodId: reportPeriod.id, results });
};
