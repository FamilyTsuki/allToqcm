export class DatabaseConnection {
  #pool;

  constructor(_config) {
    throw new Error('Method not implemented');
  }

  async query(_sql, _params = []) {
    throw new Error('Method not implemented');
  }

  async getClient() {
    throw new Error('Method not implemented');
  }

  async close() {
    throw new Error('Method not implemented');
  }
}

