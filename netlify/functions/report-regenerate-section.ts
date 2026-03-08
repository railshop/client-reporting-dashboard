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
import { SOURCE_LABELS, type SourceType } from '../../src/shared/schemas/sources';
import type { Context } from '@netlify/functions';

const aiSectionOutputSchema = z.object({
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

  // Load previous period raw data (YoY)
  const prevDate = new Date(period_start + 'T00:00:00');
  const prevYear = prevDate.getFullYear() - 1;
  const prevMonth = prevDate.getMonth();
  const prevPeriodStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;

  const prevIngestions = await sql`
    SELECT raw_data FROM raw_ingestions
    WHERE client_id = ${client_id} AND source = ${source} AND period_start = ${prevPeriodStart}
  `;

  // Load existing mechanical KPIs + campaigns for context
  const existingSection = await sql`
    SELECT rs.kpis, cm.campaigns
    FROM report_sections rs
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('campaign_name', cm.campaign_name, 'campaign_type', cm.campaign_type, 'metrics', cm.metrics)) as campaigns
      FROM campaign_metrics cm WHERE cm.report_section_id = rs.id
    ) cm ON true
    WHERE rs.report_period_id = ${reportPeriodId} AND rs.source = ${source}
  `;

  const mechanicalKpis = existingSection[0]?.kpis;
  const mechanicalCampaigns = existingSection[0]?.campaigns;

  const sourceLabel = SOURCE_LABELS[source as SourceType] || source;
  const dataContext = buildSectionDataContext(
    source,
    ingestions[0].raw_data,
    prevIngestions[0]?.raw_data,
    mechanicalKpis,
    mechanicalCampaigns
  );

  let userMessage = `Generate the narrative analysis for the ${sourceLabel} section of ${client_name}'s monthly report.\nPeriod: ${period_start}\n\n${dataContext}`;
  if (prompt) {
    userMessage += `\n\nAdmin guidance: ${prompt}`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: AI_SECTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawOutput = textBlock?.text || '';

    let parsed: any;
    try {
      let jsonStr = rawOutput.trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '');
      jsonStr = jsonStr.replace(/\n?```\s*$/, '');
      jsonStr = jsonStr.trim();
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

    const narrative = validation.data;

    // Update ONLY notes + priorities — do NOT overwrite KPIs/tables
    await sql`
      UPDATE report_sections SET
        railshop_notes = ${narrative.railshop_notes || null},
        next_priorities = ${narrative.next_priorities.length > 0 ? narrative.next_priorities : null},
        updated_at = now()
      WHERE report_period_id = ${reportPeriodId} AND source = ${source}
    `;

    return jsonResponse({ status: 'success', source });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'AI generation failed' }, 500);
  }
};
