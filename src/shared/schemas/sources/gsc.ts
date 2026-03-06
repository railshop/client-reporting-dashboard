import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const gscSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    topQueries: tableDefSchema,
    topPages: tableDefSchema,
    positionDistribution: tableDefSchema.optional(),
    deviceBreakdown: tableDefSchema.optional(),
  }),
});

export type GSCSectionData = z.infer<typeof gscSectionSchema>;
