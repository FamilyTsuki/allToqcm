import express from 'express';

export class Server {
  #app;
  #port;
  #serverInstance;

  constructor(port = 3000, routes = [], errorHandler = null) {
    this.#port = Number(port);
    this.#app = express();
    this.#serverInstance = null;

    this.#app.use(express.json());

    for (const { path, router } of routes) {
      this.#app.use(path, router);
    }

    if (errorHandler) {
      this.#app.use(errorHandler);
    }
  }

  get app() {
    return this.#app;
  }

  start() {
    return new Promise((resolve) => {
      this.#serverInstance = this.#app.listen(this.#port, () => {
        resolve(this.#serverInstance);
      });
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.#serverInstance) {
        resolve();
        return;
      }

      this.#serverInstance.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.#serverInstance = null;
        resolve();
      });
    });
  }
}
