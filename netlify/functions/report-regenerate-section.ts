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
import { AI_SECTION_SYSTEM_PROMPT, buildSectionDataContext } from './_shared/ai-prompts';
import { kpiItemSchema, tableDefSchema } from '../../src/shared/schemas/common';
import { SOURCE_LABELS, type SourceType } from '../../src/shared/schemas/sources';
import type { Context } from '@netlify/functions';

const aiSectionOutputSchema = z.object({
  kpis: z.array(kpiItemSchema),
  tables: z.record(z.string(), tableDefSchema).default({}),
  campaigns: z.array(z.object({
    campaign_name: z.string(),
    campaign_type: z.string(),
    metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  })).default([]),
  railshop_notes: z.string().optional(),
  next_priorities: z.array(z.string()).default([]),
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
  const { reportPeriodId, source, prompt } = body;

  if (!reportPeriodId || !source) {
    return jsonResponse({ error: 'reportPeriodId and source required' }, 400);
  }

  // Get report period + client info
  const periods = await sql`
    SELECT rp.id, rp.client_id, rp.period_start, c.name as client_name
    FROM report_periods rp
    JOIN clients c ON rp.client_id = c.id
    WHERE rp.id = ${reportPeriodId}
  `;
  if (periods.length === 0) {
    return jsonResponse({ error: 'Report period not found' }, 404);
  }
  const { client_id, period_start, client_name } = periods[0];

  // Load raw data for this source
  const ingestions = await sql`
    SELECT raw_data FROM raw_ingestions
    WHERE client_id = ${client_id} AND source = ${source} AND period_start = ${period_start}
  `;
  if (ingestions.length === 0) {
    return jsonResponse({ error: `No raw data found for ${source}` }, 400);
  }

  // Load previous period raw data for comparison
  const prevDate = new Date(period_start + 'T00:00:00');
  const prevYear = prevDate.getMonth() === 0 ? prevDate.getFullYear() - 1 : prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() === 0 ? 12 : prevDate.getMonth();
  const prevPeriodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  const prevIngestions = await sql`
    SELECT raw_data FROM raw_ingestions
    WHERE client_id = ${client_id} AND source = ${source} AND period_start = ${prevPeriodStart}
  `;

  const sourceLabel = SOURCE_LABELS[source as SourceType] || source;
  const dataContext = buildSectionDataContext(
    source,
    ingestions[0].raw_data,
    prevIngestions[0]?.raw_data
  );

  let userMessage = `Generate the ${sourceLabel} section for ${client_name}'s monthly report.\nPeriod: ${period_start}\n\n${dataContext}`;
  if (prompt) {
    userMessage += `\n\nAdmin guidance: ${prompt}`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: AI_SECTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawOutput = textBlock?.text || '';

    let parsed: any;
    try {
      const jsonStr = rawOutput.replace(/^```json?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return jsonResponse({ error: 'Claude returned invalid JSON', rawOutput }, 422);
    }

    const validation = aiSectionOutputSchema.safeParse(parsed);
    if (!validation.success) {
      return jsonResponse({
        error: 'Claude output failed schema validation',
        validationErrors: validation.error.issues,
        rawOutput,
      }, 422);
    }

    const section = validation.data;

    // Upsert section
    const sectionResult = await sql`
      INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
      VALUES (
        ${reportPeriodId},
        ${source},
        ${JSON.stringify(section.kpis)}::jsonb,
        ${JSON.stringify(section.tables)}::jsonb,
        ${section.railshop_notes || null},
        ${section.next_priorities.length > 0 ? section.next_priorities : null}
      )
      ON CONFLICT (report_period_id, source)
      DO UPDATE SET
        kpis = ${JSON.stringify(section.kpis)}::jsonb,
        tables = ${JSON.stringify(section.tables)}::jsonb,
        railshop_notes = ${section.railshop_notes || null},
        next_priorities = ${section.next_priorities.length > 0 ? section.next_priorities : null},
        updated_at = now()
      RETURNING id
    `;

    // Update campaigns
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

    return jsonResponse({ status: 'success', source });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'AI generation failed' }, 500);
  }
};
