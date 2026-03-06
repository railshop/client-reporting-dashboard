import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const googleAdsSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    assetGroupPerformance: tableDefSchema.optional(),
  }),
});

export const googleAdsCampaignSchema = z.object({
  campaign_name: z.string(),
  campaign_type: z.string(),
  metrics: z.object({
    impressions: z.number(),
    clicks: z.number(),
    ctr: z.string(),
    cpc: z.string(),
    conversions: z.number(),
    cost_per_conversion: z.string(),
    spend: z.string(),
    roas: z.string().optional(),
  }),
});

export type GoogleAdsSectionData = z.infer<typeof googleAdsSectionSchema>;
export type GoogleAdsCampaign = z.infer<typeof googleAdsCampaignSchema>;
