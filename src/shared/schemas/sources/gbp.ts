import { z } from 'zod';
import { kpiItemSchema, tableDefSchema } from '../common';

export const gbpSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({
    searchQueries: tableDefSchema.optional(),
    photoViews: tableDefSchema.optional(),
  }),
});

export type GBPSectionData = z.infer<typeof gbpSectionSchema>;
