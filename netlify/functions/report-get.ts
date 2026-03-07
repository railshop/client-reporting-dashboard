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

  const url = new URL(request.url);
  const clientSlug = url.searchParams.get('client');
  const period = url.searchParams.get('period'); // YYYY-MM or omit for latest

  if (!clientSlug) {
    return jsonResponse({ error: 'client query param required' }, 400);
  }

  // Client users can only see their own data
  if (payload.role === 'client' && payload.clientSlug !== clientSlug) {
    return forbidden();
  }

  // Get client
  const clients = await sql`
    SELECT id, slug, name, logo_url FROM clients WHERE slug = ${clientSlug}
  `;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const client = clients[0];

  // Get report period (specific or latest)
  // Client users can only see published reports
  const isClient = payload.role === 'client';
  let periods;
  if (period) {
    const periodStart = `${period}-01`;
    periods = isClient
      ? await sql`
          SELECT id, period_start, status, overview, railshop_notes, next_priorities, published_at
          FROM report_periods
          WHERE client_id = ${client.id} AND period_start = ${periodStart} AND status = 'published'
        `
      : await sql`
          SELECT id, period_start, status, overview, railshop_notes, next_priorities, published_at
          FROM report_periods
          WHERE client_id = ${client.id} AND period_start = ${periodStart}
        `;
  } else {
    periods = isClient
      ? await sql`
          SELECT id, period_start, status, overview, railshop_notes, next_priorities, published_at
          FROM report_periods
          WHERE client_id = ${client.id} AND status = 'published'
          ORDER BY period_start DESC
          LIMIT 1
        `
      : await sql`
          SELECT id, period_start, status, overview, railshop_notes, next_priorities, published_at
          FROM report_periods
          WHERE client_id = ${client.id}
          ORDER BY period_start DESC
          LIMIT 1
        `;
  }

  if (periods.length === 0) {
    return jsonResponse({ error: 'No report found for this period' }, 404);
  }
  const reportPeriod = periods[0];

  // Get all sections for this period
  const sections = await sql`
    SELECT id, source, kpis, tables, railshop_notes, next_priorities
    FROM report_sections
    WHERE report_period_id = ${reportPeriod.id}
    ORDER BY source
  `;

  // Get campaign metrics for each section that has them
  const sectionIds = sections.map((s: any) => s.id);
  let campaigns: any[] = [];
  if (sectionIds.length > 0) {
    campaigns = await sql`
      SELECT id, report_section_id, campaign_name, campaign_type, metrics
      FROM campaign_metrics
      WHERE report_section_id = ANY(${sectionIds})
      ORDER BY campaign_name
    `;
  }

  // Attach campaigns to their sections
  const sectionsWithCampaigns = sections.map((section: any) => ({
    ...section,
    campaigns: campaigns.filter((c: any) => c.report_section_id === section.id),
  }));

  return jsonResponse({
    client: {
      slug: client.slug,
      name: client.name,
      logo_url: client.logo_url,
    },
    period: {
      id: reportPeriod.id,
      period_start: reportPeriod.period_start,
      status: reportPeriod.status,
      overview: reportPeriod.overview,
      railshop_notes: reportPeriod.railshop_notes,
      next_priorities: reportPeriod.next_priorities,
      published_at: reportPeriod.published_at,
    },
    sections: sectionsWithCampaigns,
  });
};
