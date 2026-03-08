import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const servicetitanSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    campaignPerformance: tableDefSchema.optional(),
  }),
});

export type ServiceTitanSectionData = z.infer<typeof servicetitanSectionSchema>;
