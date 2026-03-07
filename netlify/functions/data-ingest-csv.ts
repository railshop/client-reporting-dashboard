import { sql } from './_shared/db';
import {
  getTokenFromHeaders,
  verifyToken,
  unauthorized,
  forbidden,
  jsonResponse,
} from './_shared/auth-middleware';
import {
  CSV_SOURCE_MAPPINGS,
  parseCsvValue,
  buildRawDataFromCsv,
} from '../../src/shared/schemas/csv-mappings';
import type { SourceType } from '../../src/shared/schemas/sources';
import type { CsvColumnDef } from '../../src/shared/schemas/csv-mappings';
import type { Context } from '@netlify/functions';

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = getTokenFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  if (!token) return unauthorized();

  const payload = verifyToken(token);
  if (!payload) return unauthorized('Invalid or expired token');
  if (payload.role !== 'admin') return forbidden();

  const body = await request.json();
  const { clientSlug, periodStart, source, csvText, columnMap } = body;

  if (!clientSlug || !periodStart || !source || !csvText) {
    return jsonResponse(
      { error: 'clientSlug, periodStart, source, and csvText required' },
      400
    );
  }

  const sourceMapping = CSV_SOURCE_MAPPINGS[source as SourceType];
  if (!sourceMapping) {
    return jsonResponse({ error: `No CSV mapping defined for source: ${source}` }, 400);
  }

  // Parse CSV
  const { headers, rows: rawRows } = parseCsvText(csvText);
  if (headers.length === 0 || rawRows.length === 0) {
    return jsonResponse({ error: 'CSV is empty or has no data rows' }, 400);
  }

  // columnMap: { csvHeader -> targetField } provided by frontend after admin review
  // If not provided, attempt auto-matching by column index
  const mapping: Record<string, CsvColumnDef> = {};
  if (columnMap && typeof columnMap === 'object') {
    for (const [csvHeader, targetField] of Object.entries(columnMap)) {
      const colDef = sourceMapping.columns.find((c) => c.field === targetField);
      if (colDef) {
        mapping[csvHeader] = colDef;
      }
    }
  } else {
    // Auto-map by position (first N columns)
    for (let i = 0; i < Math.min(headers.length, sourceMapping.columns.length); i++) {
      mapping[headers[i]] = sourceMapping.columns[i];
    }
  }

  // Check required fields are mapped
  const mappedFields = new Set(Object.values(mapping).map((c) => c.field));
  const missingRequired = sourceMapping.columns
    .filter((c) => c.required && !mappedFields.has(c.field))
    .map((c) => c.label);

  if (missingRequired.length > 0) {
    return jsonResponse(
      { error: `Missing required columns: ${missingRequired.join(', ')}` },
      400
    );
  }

  // Convert CSV rows to typed objects
  const parsedRows = rawRows.map((row) => {
    const obj: Record<string, string | number> = {};
    for (let i = 0; i < headers.length; i++) {
      const colDef = mapping[headers[i]];
      if (colDef) {
        obj[colDef.field] = parseCsvValue(row[i] || '', colDef.type);
      }
    }
    return obj;
  });

  // Build raw_data in the same shape as API pulls
  const rawData = buildRawDataFromCsv(
    source as SourceType,
    parsedRows,
    sourceMapping
  );

  // Get client
  const clients = await sql`SELECT id FROM clients WHERE slug = ${clientSlug}`;
  if (clients.length === 0) {
    return jsonResponse({ error: 'Client not found' }, 404);
  }
  const clientId = clients[0].id;

  // Upsert into raw_ingestions
  await sql`
    INSERT INTO raw_ingestions (client_id, source, period_start, raw_data, metadata)
    VALUES (
      ${clientId},
      ${source},
      ${periodStart},
      ${JSON.stringify(rawData)}::jsonb,
      ${JSON.stringify({
        importedAt: new Date().toISOString(),
        importType: 'csv',
        filename: body.filename || 'unknown.csv',
        rowCount: parsedRows.length,
      })}::jsonb
    )
    ON CONFLICT (client_id, source, period_start)
    DO UPDATE SET
      raw_data = ${JSON.stringify(rawData)}::jsonb,
      metadata = ${JSON.stringify({
        importedAt: new Date().toISOString(),
        importType: 'csv',
        filename: body.filename || 'unknown.csv',
        rowCount: parsedRows.length,
      })}::jsonb
  `;

  return jsonResponse({
    status: 'success',
    source,
    rowCount: parsedRows.length,
    fields: [...mappedFields],
  });
};
