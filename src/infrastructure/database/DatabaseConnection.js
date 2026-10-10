import pg from 'pg';

const { Pool } = pg;

export class DatabaseConnection {
  #pool;

  constructor(config = {}) {
    this.#pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: Number(config.port || process.env.DB_PORT || 5432),
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD || 'postgres',
      database: config.database || process.env.DB_NAME || 'qcm_db',
    });
  }

  async query(sql, params = []) {
    return this.#pool.query(sql, params);
  }

  async getClient() {
    return this.#pool.connect();
  }

  async close() {
    await this.#pool.end();
  }
}
