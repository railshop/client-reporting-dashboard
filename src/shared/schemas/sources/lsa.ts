import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const lsaSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    leadBreakdown: tableDefSchema.optional(),
    serviceAreaPerformance: tableDefSchema.optional(),
  }),
});

export type LSASectionData = z.infer<typeof lsaSectionSchema>;
