import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { AI_REPORT_SYSTEM_PROMPT, buildRawDataContext } from './_shared/ai-prompts';
import { transformRawData } from './_shared/transforms';
import { kpiItemSchema } from '../../src/shared/schemas/common';
import { getPreviousDateRange } from './_shared/data-pull-utils';
import type { Context } from '@netlify/functions';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

// Validation schema for Claude's narrative-only output
const aiReportOutputSchema = z.object({
  overview: z.object({
    headline: z.string().optional(),
    summary: z.string().optional(),
    hero_stats: z.array(kpiItemSchema).optional(),
    platform_cards: z.array(z.object({
      platform: z.string(),
      metrics: z.array(z.object({ label: z.string(), value: z.string() })),
      spend: z.string(),
    })).optional(),
  }),
  sections: z.record(z.string(), z.object({
    railshop_notes: z.string().optional(),
    next_priorities: z.array(z.string()).default([]),
  })),
});

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  const body = await request.json();
  const { clientSlug, periodStart, prompt } = body;

  if (!clientSlug || !periodStart) {
    return jsonResponse({ error: 'clientSlug and periodStart required' }, 400);
  }

  // Get client
  const clients = await sql`SELECT id, name FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;
  const clientName = clients[0].name;

  // Create or find report period
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

  // Set status to pending
  await sql`
    UPDATE report_periods
    SET ai_status = 'pending', ai_error = NULL, updated_at = now()
    WHERE id = ${reportPeriod.id}
  `;

  // --- Background work starts here ---

  try {
    await sql`
      UPDATE report_periods SET ai_status = 'generating', updated_at = now()
      WHERE id = ${reportPeriod.id}
    `;

    // Load current period raw_ingestions
    const ingestions = await sql`
      SELECT source, raw_data
      FROM raw_ingestions
      WHERE client_id = ${clientId} AND period_start = ${periodStart}
    `;

    if (ingestions.length === 0) {
      await sql`
        UPDATE report_periods
        SET ai_status = 'error', ai_error = 'No ingested data found. Run data ingestion first.', updated_at = now()
        WHERE id = ${reportPeriod.id}
      `;
      return new Response();
    }

    // ── Step 1: Mechanical transforms ──
    // Run transforms and write KPIs/tables/campaigns to report_sections
    const mechanicalSections: Array<{ source: string; kpis: any[]; tables: Record<string, any>; campaigns?: any[] }> = [];

    for (const ingestion of ingestions) {
      const source = ingestion.source as SourceType;
      const rawData = ingestion.raw_data;
      const data = transformRawData(source, rawData);
      if (!data) continue;

      mechanicalSections.push({
        source,
        kpis: data.kpis,
        tables: data.tables,
        campaigns: data.campaigns,
      });

      // Include channel rollups in tables JSONB for ServiceTitan
      const tablesToStore = {
        ...(data.tables || {}),
        ...(data.channelRollups ? { _channelRollups: data.channelRollups } : {}),
      };

      // Upsert section with mechanical data (KPIs, tables, campaigns)
      const sectionResult = await sql`
        INSERT INTO report_sections (report_period_id, source, kpis, tables)
        VALUES (
          ${reportPeriod.id},
          ${source},
          ${JSON.stringify(data.kpis)}::jsonb,
          ${JSON.stringify(tablesToStore)}::jsonb
        )
        ON CONFLICT (report_period_id, source)
        DO UPDATE SET
          kpis = ${JSON.stringify(data.kpis)}::jsonb,
          tables = ${JSON.stringify(tablesToStore)}::jsonb,
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
    }

    // ── Step 2: AI narrative generation ──
    // Load previous period raw_ingestions for Claude's context
    const prev = getPreviousDateRange(periodStart);
    const previousIngestions = await sql`
      SELECT source, raw_data
      FROM raw_ingestions
      WHERE client_id = ${clientId} AND period_start = ${prev.startDate}
    `;

    // Build data context including mechanical KPIs for Claude to reference
    const dataContext = buildRawDataContext(
      ingestions as any[],
      previousIngestions as any[],
      mechanicalSections
    );

    let userMessage = `Generate the narrative portions of the monthly performance report for ${clientName}.\nPeriod: ${periodStart}\n\nRaw data and computed KPIs:\n${dataContext}`;
    if (prompt) {
      userMessage += `\n\nAdmin guidance: ${prompt}`;
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: AI_REPORT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawOutput = textBlock?.text || '';

    // Parse JSON from Claude's response
    let parsed: any;
    try {
      let jsonStr = rawOutput.trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '');
      jsonStr = jsonStr.replace(/\n?```\s*$/, '');
      jsonStr = jsonStr.trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      console.error('[ai-background] JSON parse failed. First 500 chars:', rawOutput.slice(0, 500));
      await sql`
        UPDATE report_periods
        SET ai_status = 'error', ai_error = ${'Claude returned invalid JSON: ' + (parseErr.message || '')}, updated_at = now()
        WHERE id = ${reportPeriod.id}
      `;
      return new Response();
    }

    // Validate with Zod
    const validation = aiReportOutputSchema.safeParse(parsed);
    if (!validation.success) {
      await sql`
        UPDATE report_periods
        SET ai_status = 'error', ai_error = ${'Schema validation failed: ' + JSON.stringify(validation.error.issues.slice(0, 3))}, updated_at = now()
        WHERE id = ${reportPeriod.id}
      `;
      return new Response();
    }

    const reportData = validation.data;

    // Write overview (AI-generated)
    await sql`
      UPDATE report_periods SET
        overview = ${JSON.stringify(reportData.overview)}::jsonb,
        updated_at = now()
      WHERE id = ${reportPeriod.id}
    `;

    // Write AI narrative (notes + priorities) to existing sections — do NOT overwrite KPIs/tables
    for (const [source, narrative] of Object.entries(reportData.sections)) {
      await sql`
        UPDATE report_sections SET
          railshop_notes = ${narrative.railshop_notes || null},
          next_priorities = ${narrative.next_priorities.length > 0 ? narrative.next_priorities : null},
          updated_at = now()
        WHERE report_period_id = ${reportPeriod.id} AND source = ${source}
      `;
    }

    // Mark complete
    await sql`
      UPDATE report_periods
      SET ai_status = 'complete', ai_error = NULL, updated_at = now()
      WHERE id = ${reportPeriod.id}
    `;
  } catch (err: any) {
    await sql`
      UPDATE report_periods
      SET ai_status = 'error', ai_error = ${err.message || 'AI generation failed'}, updated_at = now()
      WHERE id = ${reportPeriod.id}
    `;
  }

  return new Response();
};
