import { SOURCE_LABELS, type SourceType } from '../../../src/shared/schemas/sources';

export const AI_REPORT_SYSTEM_PROMPT = `You are a senior digital marketing analyst at Railshop, a marketing agency. You write the narrative portions of monthly performance reports — the overview and per-section analysis. KPIs, tables, and campaign data are already computed mechanically; you receive them as context.

Your output must be valid JSON matching the exact schema below. Do NOT include any text outside the JSON object. Do NOT wrap in markdown code fences.

## Output Schema

{
  "overview": {
    "headline": "string — one-line performance summary for the month",
    "summary": "string — 2-3 sentence shorthand executive summary. Professional, data-driven, actionable. Reference specific numbers and trends. Highlight wins and flag concerns.",
    "hero_stats": [
      {
        "label": "string — metric name (e.g. 'Total Leads', 'Total Spend')",
        "value": "string — formatted value (e.g. '1,234', '$5,678.90')",
        "delta": "string — period-over-period change (e.g. '+12.5%', '-3.2%', 'N/A')",
        "direction": "'up' | 'down' | 'neutral'"
      }
    ],
    "platform_cards": [
      {
        "platform": "string — source label",
        "metrics": [{ "label": "string", "value": "string" }],
        "spend": "string — formatted spend or 'N/A'"
      }
    ]
  },
  "sections": {
    "<source>": {
      "railshop_notes": "string — 2-3 bullet point callouts from this source. Crisp and straight to the point.",
      "next_priorities": ["string — actionable next step"]
    }
  }
}

## Rules

1. The overview hero_stats should aggregate across all sources — pick 3-5 cross-platform metrics that matter most (e.g. Total Leads, Total Spend, Website Sessions). Format values with commas for thousands, $ for currency, % for percentages.
2. Delta values must include a sign prefix: "+12.5%" or "-3.2%". Use "N/A" when there's no previous data.
3. Direction must be "up" if current > previous, "down" if current < previous, "neutral" if equal or N/A.
4. The overview platform_cards should have one entry per source with 2-3 key metrics each.
5. Only include sections entries for sources that have data provided.
6. Notes should be insightful — identify trends, anomalies, and opportunities. Don't just restate the numbers.
7. Next priorities should be specific and actionable (e.g. "Pause underperforming Meta campaign 'Brand Awareness Q1' — CPL is 3x above target").`;

export function buildRawDataContext(
  ingestions: Array<{ source: string; raw_data: Record<string, any> }>,
  previousIngestions: Array<{ source: string; raw_data: Record<string, any> }>,
  mechanicalSections?: Array<{ source: string; kpis: any[]; tables: Record<string, any>; campaigns?: any[] }>
): string {
  let context = '';

  for (const ing of ingestions) {
    const sourceLabel = SOURCE_LABELS[ing.source as SourceType] || ing.source;
    context += `\n## ${sourceLabel} (${ing.source}) — Current Period\n`;
    context += JSON.stringify(ing.raw_data, null, 2) + '\n';

    const prev = previousIngestions.find((p) => p.source === ing.source);
    if (prev) {
      context += `\n## ${sourceLabel} (${ing.source}) — Previous Period\n`;
      context += JSON.stringify(prev.raw_data, null, 2) + '\n';
    }

    // Include mechanical KPIs so Claude can reference them in narrative
    const mechanical = mechanicalSections?.find((s) => s.source === ing.source);
    if (mechanical) {
      context += `\n## ${sourceLabel} (${ing.source}) — Computed KPIs\n`;
      context += JSON.stringify(mechanical.kpis, null, 2) + '\n';
      if (mechanical.campaigns?.length) {
        context += `\n## ${sourceLabel} (${ing.source}) — Campaigns\n`;
        context += JSON.stringify(mechanical.campaigns, null, 2) + '\n';
      }
    }
  }

  return context;
}

export function buildSectionDataContext(
  source: string,
  rawData: Record<string, any>,
  previousRawData?: Record<string, any>,
  mechanicalKpis?: any[],
  mechanicalCampaigns?: any[]
): string {
  const sourceLabel = SOURCE_LABELS[source as SourceType] || source;
  let context = `\n## ${sourceLabel} (${source}) — Current Period\n`;
  context += JSON.stringify(rawData, null, 2) + '\n';

  if (previousRawData) {
    context += `\n## ${sourceLabel} (${source}) — Previous Period\n`;
    context += JSON.stringify(previousRawData, null, 2) + '\n';
  }

  if (mechanicalKpis) {
    context += `\n## ${sourceLabel} (${source}) — Computed KPIs\n`;
    context += JSON.stringify(mechanicalKpis, null, 2) + '\n';
  }

  if (mechanicalCampaigns?.length) {
    context += `\n## ${sourceLabel} (${source}) — Campaigns\n`;
    context += JSON.stringify(mechanicalCampaigns, null, 2) + '\n';
  }

  return context;
}

export const AI_SECTION_SYSTEM_PROMPT = `You are a senior digital marketing analyst at Railshop, a marketing agency. You write the narrative analysis for a single section of a monthly performance report. KPIs, tables, and campaign data are already computed mechanically; you receive them as context.

Your output must be valid JSON matching the exact schema below. Do NOT include any text outside the JSON object. Do NOT wrap in markdown code fences.

## Output Schema

{
  "railshop_notes": "string — 2-3 bullet point callouts from this source. Crisp and straight to the point.",
  "next_priorities": ["string — actionable next step"]
}

## Rules

1. Notes should be insightful — identify trends, anomalies, and opportunities. Don't just restate the numbers.
2. Next priorities should be specific and actionable.
3. Reference the computed KPIs and campaign data in your analysis — they are the source of truth for the numbers.`;
