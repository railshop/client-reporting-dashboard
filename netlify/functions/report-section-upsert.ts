import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { sectionSchemaMap, type SourceType } from '../../src/shared/schemas/sources';
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
  const { reportPeriodId, source, kpis, tables, railshop_notes, next_priorities } = body;

  if (!reportPeriodId || !source) {
    return jsonResponse({ error: 'reportPeriodId and source required' }, 400);
  }

  const validSources = Object.keys(sectionSchemaMap);
  if (!validSources.includes(source)) {
    return jsonResponse({ error: `Invalid source: ${source}` }, 400);
  }

  // Validate section data if both kpis and tables provided
  if (kpis !== undefined && tables !== undefined) {
    const schema = sectionSchemaMap[source as SourceType];
    const parsed = schema.safeParse({ kpis, tables });
    if (!parsed.success) {
      return jsonResponse(
        { error: 'Invalid section data', details: parsed.error.flatten().fieldErrors },
        400
      );
    }
  }

  const result = await sql`
    INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
    VALUES (
      ${reportPeriodId},
      ${source},
      ${kpis !== undefined ? JSON.stringify(kpis) : '[]'}::jsonb,
      ${tables !== undefined ? JSON.stringify(tables) : '{}'}::jsonb,
      ${railshop_notes ?? null},
      ${next_priorities ?? null}
    )
    ON CONFLICT (report_period_id, source)
    DO UPDATE SET
      kpis = COALESCE(${kpis !== undefined ? JSON.stringify(kpis) : null}::jsonb, report_sections.kpis),
      tables = COALESCE(${tables !== undefined ? JSON.stringify(tables) : null}::jsonb, report_sections.tables),
      railshop_notes = COALESCE(${railshop_notes ?? null}, report_sections.railshop_notes),
      next_priorities = COALESCE(${next_priorities ?? null}, report_sections.next_priorities),
      updated_at = now()
    RETURNING id, source, kpis, tables, railshop_notes, next_priorities
  `;

  return jsonResponse({ section: result[0] });
};
