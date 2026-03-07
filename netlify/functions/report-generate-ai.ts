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
import { kpiItemSchema, tableDefSchema } from '../../src/shared/schemas/common';
import { getPreviousDateRange } from './_shared/data-pull-utils';
import type { Context } from '@netlify/functions';

// Validation schema for Claude's full report output
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
  sections: z.array(z.object({
    source: z.string(),
    kpis: z.array(kpiItemSchema),
    tables: z.record(z.string(), tableDefSchema).default({}),
    campaigns: z.array(z.object({
      campaign_name: z.string(),
      campaign_type: z.string(),
      metrics: z.record(z.string(), z.union([z.string(), z.number()])),
    })).default([]),
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

  // Load current period raw_ingestions
  const ingestions = await sql`
    SELECT source, raw_data
    FROM raw_ingestions
    WHERE client_id = ${clientId} AND period_start = ${periodStart}
  `;

  if (ingestions.length === 0) {
    return jsonResponse({ error: 'No ingested data found. Run data ingestion first.' }, 400);
  }

  // Load previous period raw_ingestions for comparison
  const prev = getPreviousDateRange(periodStart);
  const previousIngestions = await sql`
    SELECT source, raw_data
    FROM raw_ingestions
    WHERE client_id = ${clientId} AND period_start = ${prev.startDate}
  `;

  // Build data context for Claude
  const dataContext = buildRawDataContext(
    ingestions as any[],
    previousIngestions as any[]
  );

  let userMessage = `Generate a monthly performance report for ${clientName}.\nPeriod: ${periodStart}\n\nRaw data:\n${dataContext}`;
  if (prompt) {
    userMessage += `\n\nAdmin guidance: ${prompt}`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: AI_REPORT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawOutput = textBlock?.text || '';

    // Parse JSON from Claude's response
    let parsed: any;
    try {
      // Handle potential markdown code fences
      const jsonStr = rawOutput.replace(/^```json?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return jsonResponse({
        error: 'Claude returned invalid JSON',
        rawOutput,
      }, 422);
    }

    // Validate with Zod
    const validation = aiReportOutputSchema.safeParse(parsed);
    if (!validation.success) {
      return jsonResponse({
        error: 'Claude output failed schema validation',
        validationErrors: validation.error.issues,
        rawOutput,
      }, 422);
    }

    const reportData = validation.data;

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

    // Write overview
    await sql`
      UPDATE report_periods SET
        overview = ${JSON.stringify(reportData.overview)}::jsonb,
        updated_at = now()
      WHERE id = ${reportPeriod.id}
    `;

    // Write sections
    for (const section of reportData.sections) {
      const sectionResult = await sql`
        INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
        VALUES (
          ${reportPeriod.id},
          ${section.source},
          ${JSON.stringify(section.kpis)}::jsonb,
          ${JSON.stringify(section.tables)}::jsonb,
          ${section.railshop_notes || null},
          ${section.next_priorities.length > 0 ? section.next_priorities : null}
        )
        ON CONFLICT (report_period_id, source)
        DO UPDATE SET
          kpis = ${JSON.stringify(section.kpis)}::jsonb,
          tables = ${JSON.stringify(section.tables)}::jsonb,
          railshop_notes = COALESCE(${section.railshop_notes || null}, report_sections.railshop_notes),
          next_priorities = COALESCE(${section.next_priorities.length > 0 ? section.next_priorities : null}, report_sections.next_priorities),
          updated_at = now()
        RETURNING id
      `;

      // Write campaigns if present
      if (section.campaigns.length > 0) {
        const sectionId = sectionResult[0].id;
        await sql`DELETE FROM campaign_metrics WHERE report_section_id = ${sectionId}`;
        for (const c of section.campaigns) {
          await sql`
            INSERT INTO campaign_metrics (report_section_id, campaign_name, campaign_type, metrics)
            VALUES (${sectionId}, ${c.campaign_name}, ${c.campaign_type || null}, ${JSON.stringify(c.metrics)}::jsonb)
          `;
        }
      }
    }

    return jsonResponse({ reportPeriodId: reportPeriod.id, sections: reportData.sections.length });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'AI generation failed' }, 500);
  }
};
