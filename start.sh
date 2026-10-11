#!/bin/sh
set -e

if [ ! -d "node_modules" ]; then
  npm install --omit=dev
fi

node -e "
import pg from 'pg';
async function waitDb() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const database = process.env.DB_NAME || 'postgres';

  for (let i = 0; i < 30; i++) {
    try {
      const client = new pg.Client({ host, port, user, password, database });
      await client.connect();
      await client.end();
      return process.exit(0);
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  process.exit(1);
}
waitDb();
"

npm run db:migrate
npm start

