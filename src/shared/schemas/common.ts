import { z } from 'zod';

export const kpiItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  delta: z.string(),
  direction: z.enum(['up', 'down', 'neutral']),
  color: z.enum(['blue', 'green', 'gold', 'default']).default('default'),
});

export const columnDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  align: z.enum(['left', 'right']).default('left'),
});

export const tableDefSchema = z.object({
  title: z.string(),
  columns: z.array(columnDefSchema),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  footerRow: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const overviewSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  hero_stats: z.array(kpiItemSchema).optional(),
  platform_cards: z.array(z.object({
    platform: z.string(),
    metrics: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })),
    spend: z.string(),
  })).optional(),
});

export type KpiItem = z.infer<typeof kpiItemSchema>;
export type ColumnDef = z.infer<typeof columnDefSchema>;
export type TableDef = z.infer<typeof tableDefSchema>;
export type Overview = z.infer<typeof overviewSchema>;
