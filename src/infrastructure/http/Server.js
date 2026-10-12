import express from 'express';
import path from 'node:path';
import { securityHeaders } from '../../presentation/middlewares/securityHeaders.js';

export class Server {
  #app;
  #port;
  #serverInstance;

  constructor(port = 3000, routes = [], errorHandler = null, staticPath = 'public') {
    this.#port = Number(port);
    this.#app = express();
    this.#serverInstance = null;

    this.#app.disable('x-powered-by');
    this.#app.use(securityHeaders);
    this.#app.use(express.json({ limit: '100kb' }));

    if (staticPath) {
      this.#app.use(
        express.static(path.resolve(staticPath), {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
              res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            }
          },
        }),
      );
    }

    for (const { path: routePath, router } of routes) {
      this.#app.use(routePath, router);
    }

    if (errorHandler) {
      this.#app.use(errorHandler);
    }
  }

  get app() {
    return this.#app;
  }

  get port() {
    return this.#port;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.#serverInstance = this.#app.listen(this.#port, () => {
        resolve(this.#serverInstance);
      });

      this.#serverInstance.once('error', (err) => {
        reject(err);
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
