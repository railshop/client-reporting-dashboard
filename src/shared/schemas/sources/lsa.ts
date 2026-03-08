import { z } from 'zod';
import { kpiItemSchema } from '../common';

export const lsaSectionSchema = z.object({
  kpis: z.array(kpiItemSchema).min(1),
  tables: z.object({}).optional(),
});

export type LSASectionData = z.infer<typeof lsaSectionSchema>;
