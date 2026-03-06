import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const ga4SectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    channelBreakdown: tableDefSchema,
    topLandingPages: tableDefSchema,
  }),
});

export type GA4SectionData = z.infer<typeof ga4SectionSchema>;
