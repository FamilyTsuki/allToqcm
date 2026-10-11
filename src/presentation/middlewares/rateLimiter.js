export class RateLimiter {
  #windowMs;
  #maxRequests;
  #requests;

  constructor(windowMs = 60000, maxRequests = 100) {
    this.#windowMs = windowMs;
    this.#maxRequests = maxRequests;
    this.#requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const now = Date.now();
      const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

      let timestamps = this.#requests.get(ip) || [];
      timestamps = timestamps.filter((time) => now - time < this.#windowMs);

      if (timestamps.length >= this.#maxRequests) {
        res.setHeader('Retry-After', Math.ceil(this.#windowMs / 1000));
        res.status(429).json({ error: 'Trop de requêtes, veuillez réessayer plus tard' });
        return;
      }

      timestamps.push(now);
      this.#requests.set(ip, timestamps);

      res.setHeader('X-RateLimit-Limit', this.#maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.#maxRequests - timestamps.length));

      next();
    };
  }

  reset() {
    this.#requests.clear();
  }
}
