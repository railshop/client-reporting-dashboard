import Anthropic from '@anthropic-ai/sdk';
import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import { buildSectionDataContext, buildRawDataContext } from './_shared/ai-prompts';
import { SOURCE_LABELS, type SourceType } from '../../src/shared/schemas/sources';
import type { Context } from '@netlify/functions';

const SYSTEM_PROMPT = `You are a digital marketing analyst writing monthly performance summaries for Railshop, a marketing agency. Your tone is professional, data-driven, and actionable. Crisp, direct, and brief, even if that means breaking slightly from grammatically correct sentences. Don't use em dashes. Reference specific numbers and trends from the data provided. Highlight wins and flag concerns. Do not use bullet points or headers — write flowing prose.

CRITICAL LENGTH CONSTRAINT: Keep summaries to 35-45 words maximum. This is a strict limit. Be extremely concise — every word must earn its place.`;

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
  const { source, kpis, tables, campaigns, userPrompt, type, fromRawData, clientSlug, periodStart } = body;

  if (!type || !['section', 'overview'].includes(type)) {
    return jsonResponse({ error: 'type must be "section" or "overview"' }, 400);
  }

  // Build the data context for the AI
  let dataContext = '';

  // If fromRawData is true, fetch context from raw_ingestions SSOT
  if (fromRawData && clientSlug && periodStart) {
    const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
    if (clients.length > 0) {
      const clientId = clients[0].id;

      if (type === 'section' && source) {
        const ingestions = await sql`
          SELECT raw_data FROM raw_ingestions
          WHERE client_id = ${clientId} AND source = ${source} AND period_start = ${periodStart}
        `;
        if (ingestions.length > 0) {
          // Get previous period for comparison
          const prevDate = new Date(periodStart + 'T00:00:00');
          const prevYear = prevDate.getMonth() === 0 ? prevDate.getFullYear() - 1 : prevDate.getFullYear();
          const prevMonth = prevDate.getMonth() === 0 ? 12 : prevDate.getMonth();
          const prevPeriodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

          const prevIngestions = await sql`
            SELECT raw_data FROM raw_ingestions
            WHERE client_id = ${clientId} AND source = ${source} AND period_start = ${prevPeriodStart}
          `;

          dataContext = `This is a section summary for: ${SOURCE_LABELS[source as SourceType] || source}\n\n`;
          dataContext += buildSectionDataContext(source, ingestions[0].raw_data, prevIngestions[0]?.raw_data);
        }
      } else if (type === 'overview') {
        const ingestions = await sql`
          SELECT source, raw_data FROM raw_ingestions
          WHERE client_id = ${clientId} AND period_start = ${periodStart}
        `;
        if (ingestions.length > 0) {
          const prevDate = new Date(periodStart + 'T00:00:00');
          const prevYear = prevDate.getMonth() === 0 ? prevDate.getFullYear() - 1 : prevDate.getFullYear();
          const prevMonth = prevDate.getMonth() === 0 ? 12 : prevDate.getMonth();
          const prevPeriodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

          const prevIngestions = await sql`
            SELECT source, raw_data FROM raw_ingestions
            WHERE client_id = ${clientId} AND period_start = ${prevPeriodStart}
          `;

          dataContext = 'This is an overview summary for the entire monthly report.\n\n';
          dataContext += buildRawDataContext(ingestions as any[], prevIngestions as any[]);
        }
      }
    }
  }

  // Fall back to frontend-provided data if no raw data context was built
  if (!dataContext) {
    if (type === 'overview') {
      dataContext = 'This is an overview summary for the entire monthly report.\n\n';
      if (kpis?.length) {
        dataContext += 'Hero Stats:\n';
        for (const k of kpis) {
          dataContext += `- ${k.label}: ${k.value}${k.delta ? ` (${k.direction === 'up' ? '+' : ''}${k.delta} vs last month)` : ''}\n`;
        }
        dataContext += '\n';
      }
      if (tables && Object.keys(tables).length) {
        dataContext += 'Platform Summary:\n';
        dataContext += JSON.stringify(tables, null, 2) + '\n\n';
      }
    } else {
      dataContext = `This is a section summary for: ${source}\n\n`;
      if (kpis?.length) {
        dataContext += 'KPIs:\n';
        for (const k of kpis) {
          dataContext += `- ${k.label}: ${k.value}${k.delta ? ` (${k.direction === 'up' ? '+' : ''}${k.delta} vs last month)` : ''}\n`;
        }
        dataContext += '\n';
      }
      if (tables && Object.keys(tables).length) {
        for (const [key, table] of Object.entries(tables) as [string, any][]) {
          dataContext += `Table — ${table.title || key}:\n`;
          if (table.columns && table.rows) {
            const headers = table.columns.map((c: any) => c.label).join(' | ');
            dataContext += headers + '\n';
            for (const row of table.rows.slice(0, 20)) {
              const vals = table.columns.map((c: any) => row[c.key] ?? '').join(' | ');
              dataContext += vals + '\n';
            }
          }
          dataContext += '\n';
        }
      }
      if (campaigns?.length) {
        dataContext += 'Campaigns:\n';
        for (const c of campaigns.slice(0, 20)) {
          dataContext += `- ${c.campaign_name} (${c.campaign_type || 'unknown'}): ${JSON.stringify(c.metrics)}\n`;
        }
        dataContext += '\n';
      }
    }
  }

  const userMessage = userPrompt
    ? `${dataContext}\nAdditional context from the admin: ${userPrompt}\n\nWrite the summary.`
    : `${dataContext}\nWrite the summary.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const summary = textBlock ? textBlock.text : '';

    return jsonResponse({ summary });
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'AI generation failed' }, 500);
  }
};
