import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    client = createClient({
      url: `file:${dbPath}`,
    });
  }
  return client;
}

export async function initializeDatabase() {
  const db = getDb();
  const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await db.execute(statement);
    }
  }
}
