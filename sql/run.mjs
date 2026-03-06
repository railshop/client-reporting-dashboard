import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);
const file = process.argv[2];

if (!file) {
  console.error('Usage: node sql/run.mjs <sql-file>');
  process.exit(1);
}

const content = readFileSync(file, 'utf8');

try {
  await sql.transaction(content.split(';').filter(s => s.trim()).map(s => sql(s.trim(), [], { fullResults: false })));
  console.log(`✓ ${file} executed successfully`);
} catch (e) {
  // transaction approach may not work for DDL, try sequential
  console.log('Transaction failed, trying sequential execution...');
  const statements = content.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      await sql.query(stmt.trim());
    } catch (err) {
      console.error(`Error on statement: ${stmt.trim().slice(0, 60)}...`);
      console.error(err.message);
    }
  }
  console.log(`✓ ${file} executed (sequential)`);
}
