import { sql } from './db';
import { decrypt } from './crypto';
import { credentialSchemaMap, type SourceType } from '../../../src/shared/schemas/credentials';

export async function getDecryptedCredentials(clientSlug: string, source: SourceType) {
  const rows = await sql`
    SELECT cds.config
    FROM client_data_sources cds
    JOIN clients c ON cds.client_id = c.id
    WHERE c.slug = ${clientSlug} AND cds.source = ${source} AND cds.active = true
  `;

  if (rows.length === 0) return null;

  const config = rows[0].config;
  if (!config?.credentials_encrypted) return null;

  const decrypted = JSON.parse(decrypt(config.credentials_encrypted));
  const schema = credentialSchemaMap[source];
  const parsed = schema.safeParse(decrypted);
  if (!parsed.success) return null;

  return parsed.data as Record<string, string>;
}

export function getDateRange(periodStart: string): { startDate: string; endDate: string } {
  const start = new Date(periodStart + 'T00:00:00');
  const year = start.getFullYear();
  const month = start.getMonth();
  const endDay = new Date(year, month + 1, 0).getDate();

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

export function getPreviousDateRange(periodStart: string): { startDate: string; endDate: string } {
  const start = new Date(periodStart + 'T00:00:00');
  const year = start.getMonth() === 0 ? start.getFullYear() - 1 : start.getFullYear();
  const month = start.getMonth() === 0 ? 11 : start.getMonth() - 1;
  const endDay = new Date(year, month + 1, 0).getDate();

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

export function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatPercent(n: number): string {
  return n.toFixed(1) + '%';
}

export function calcDelta(current: number, previous: number): { delta: string; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { delta: 'N/A', direction: 'neutral' };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    delta: `${sign}${pct.toFixed(1)}%`,
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  };
}
