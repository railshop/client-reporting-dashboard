import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { transformRawData } from './_shared/transforms';
import type { Context } from '@netlify/functions';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

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

  // Read raw_ingestions for this client + period
  const ingestions = await sql`
    SELECT source, raw_data
    FROM raw_ingestions
    WHERE client_id = ${clientId} AND period_start = ${periodStart}
  `;

  if (ingestions.length === 0) {
    return jsonResponse({ error: 'No ingested data found. Run data ingestion first.' }, 400);
  }

  const results: Record<string, { status: string; error?: string }> = {};
  let channelRollups: Record<string, any> | undefined;

  for (const ingestion of ingestions) {
    const source = ingestion.source as SourceType;
    const rawData = ingestion.raw_data;

    try {
      const data = transformRawData(source, rawData);
      if (!data) {
        results[source] = { status: 'skipped', error: 'No transform available' };
        continue;
      }

      // Capture channel rollups from ServiceTitan for distributing to source sections
      if (data.channelRollups) {
        channelRollups = data.channelRollups;
      }

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

  // Distribute ServiceTitan channel rollups to matching source sections
  if (channelRollups) {
    for (const [channel, rollup] of Object.entries(channelRollups)) {
      await sql`
        UPDATE report_sections
        SET servicetitan_blended = ${JSON.stringify(rollup)}::jsonb, updated_at = now()
        WHERE report_period_id = ${reportPeriod.id} AND source = ${channel}
      `;
    }
  }

  return jsonResponse({ reportPeriodId: reportPeriod.id, results });
};
