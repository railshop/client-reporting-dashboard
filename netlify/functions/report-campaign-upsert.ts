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
  const { reportSectionId, campaigns } = body;

  if (!reportSectionId || !Array.isArray(campaigns)) {
    return jsonResponse({ error: 'reportSectionId and campaigns[] required' }, 400);
  }

  // Verify section exists
  const sections = await sql`SELECT id FROM report_sections WHERE id = ${reportSectionId}`;
  if (sections.length === 0) {
    return jsonResponse({ error: 'Report section not found' }, 404);
  }

  // Delete existing campaigns for this section, then bulk insert
  await sql`DELETE FROM campaign_metrics WHERE report_section_id = ${reportSectionId}`;

  const results = [];
  for (const c of campaigns) {
    if (!c.campaign_name) continue;
    const row = await sql`
      INSERT INTO campaign_metrics (report_section_id, campaign_name, campaign_type, metrics)
      VALUES (${reportSectionId}, ${c.campaign_name}, ${c.campaign_type ?? null}, ${JSON.stringify(c.metrics || {})}::jsonb)
      RETURNING id, campaign_name, campaign_type, metrics
    `;
    results.push(row[0]);
  }

  return jsonResponse({ campaigns: results });
};
