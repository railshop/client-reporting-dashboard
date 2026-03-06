import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const metaSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    creativeBreakdown: tableDefSchema.optional(),
  }),
});

export const metaCampaignSchema = z.object({
  campaign_name: z.string(),
  campaign_type: z.string(),
  metrics: z.object({
    reach: z.number(),
    frequency: z.string(),
    impressions: z.number(),
    clicks: z.number(),
    ctr: z.string(),
    leads: z.number(),
    cpl: z.string(),
    spend: z.string(),
  }),
});

export type MetaSectionData = z.infer<typeof metaSectionSchema>;
export type MetaCampaign = z.infer<typeof metaCampaignSchema>;
