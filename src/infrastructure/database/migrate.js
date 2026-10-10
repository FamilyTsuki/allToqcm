import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseConnection } from './DatabaseConnection.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const db = new DatabaseConnection();
  try {
    const schemaPath = path.join(currentDir, 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf-8');
    await db.query(sql);
  } finally {
    await db.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
