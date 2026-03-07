import Anthropic from '@anthropic-ai/sdk';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import type { Context } from '@netlify/functions';

const SYSTEM_PROMPT = `You are a digital marketing analyst writing monthly performance summaries for Railshop, a marketing agency. Your tone is professional, data-driven, and actionable. Write in 2-3 concise paragraphs. Reference specific numbers and trends from the data provided. Highlight wins, flag concerns, and suggest next steps where appropriate. Do not use bullet points or headers — write flowing prose paragraphs.`;

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
  const { source, kpis, tables, campaigns, userPrompt, type } = body;

  if (!type || !['section', 'overview'].includes(type)) {
    return jsonResponse({ error: 'type must be "section" or "overview"' }, 400);
  }

  // Build the data context for the AI
  let dataContext = '';

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
