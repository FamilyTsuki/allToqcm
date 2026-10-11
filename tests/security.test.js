import test from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from '../src/presentation/middlewares/securityHeaders.js';
import { RateLimiter } from '../src/presentation/middlewares/rateLimiter.js';
import { Server } from '../src/infrastructure/http/Server.js';
import { SurveyCreatorController } from '../src/presentation/controllers/SurveyCreatorController.js';
import { Survey } from '../src/domain/entities/Survey.js';

function createMockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

test('securityHeaders middleware sets comprehensive security headers', () => {
  const res = createMockResponse();
  let nextCalled = false;

  securityHeaders({}, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.ok(res.headers['Content-Security-Policy']);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.equal(res.headers['X-XSS-Protection'], '1; mode=block');
  assert.equal(res.headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(res.headers['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(res.headers['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.ok(res.headers['Permissions-Policy'].includes('camera=()'));
});

test('RateLimiter middleware allows requests within limit and tracks remaining', () => {
  const limiter = new RateLimiter(10000, 3);
  const middleware = limiter.middleware();
  const req = { ip: '192.168.1.50' };

  const res1 = createMockResponse();
  let next1 = false;
  middleware(req, res1, () => (next1 = true));
  assert.equal(next1, true);
  assert.equal(res1.headers['X-RateLimit-Limit'], 3);
  assert.equal(res1.headers['X-RateLimit-Remaining'], 2);

  const res2 = createMockResponse();
  let next2 = false;
  middleware(req, res2, () => (next2 = true));
  assert.equal(next2, true);
  assert.equal(res2.headers['X-RateLimit-Remaining'], 1);

  const res3 = createMockResponse();
  let next3 = false;
  middleware(req, res3, () => (next3 = true));
  assert.equal(next3, true);
  assert.equal(res3.headers['X-RateLimit-Remaining'], 0);
});

test('RateLimiter middleware blocks requests when limit is exceeded with 429', () => {
  const limiter = new RateLimiter(5000, 2);
  const middleware = limiter.middleware();
  const req = { ip: '10.0.0.1' };

  middleware(req, createMockResponse(), () => {});
  middleware(req, createMockResponse(), () => {});

  const blockedRes = createMockResponse();
  let nextCalled = false;
  middleware(req, blockedRes, () => (nextCalled = true));

  assert.equal(nextCalled, false);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.headers['Retry-After'], 5);
  assert.ok(blockedRes.body.error);
});

test('RateLimiter reset clears tracked IP counters', () => {
  const limiter = new RateLimiter(5000, 1);
  const middleware = limiter.middleware();
  const req = { ip: '127.0.0.1' };

  middleware(req, createMockResponse(), () => {});

  const blockedRes = createMockResponse();
  middleware(req, blockedRes, () => {});
  assert.equal(blockedRes.statusCode, 429);

  limiter.reset();

  const allowedRes = createMockResponse();
  let nextCalled = false;
  middleware(req, allowedRes, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test('Server initializes with disabled x-powered-by header', () => {
  const server = new Server(9999, [], null, null);
  assert.equal(server.app.get('x-powered-by'), false);
});

test('SurveyCreatorController sanitizes malicious color parameter to default safe hex', async () => {
  const survey = new Survey('s-color-sec', 'Test Sécurité Couleur');
  let generatedColor = null;

  const controller = new SurveyCreatorController({
    getSurveyByIdUseCase: { execute: async () => survey },
    qrCodeService: {
      generateDataUrl: async (_url, opts) => {
        generatedColor = opts?.color?.dark;
        return 'data:image/png;base64,safe-qr';
      },
    },
    runnerPort: 3002,
  });

  const maliciousQueries = [
    'javascript:alert(1)',
    '<script>',
    '#zzzzzz',
    '#123',
    'red',
    '',
    '   ',
    '#3b82f6; drop table',
  ];

  for (const maliciousColor of maliciousQueries) {
    const req = {
      protocol: 'http',
      hostname: 'localhost',
      params: { id: 's-color-sec' },
      query: { color: maliciousColor },
    };
    const res = createMockResponse();
    await controller.getSurveyShare(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.color, '#000000');
    assert.equal(generatedColor, '#000000');
  }

  const validReq = {
    protocol: 'http',
    hostname: 'localhost',
    params: { id: 's-color-sec' },
    query: { color: '#10b981' },
  };
  const validRes = createMockResponse();
  await controller.getSurveyShare(validReq, validRes, () => {});
  assert.equal(validRes.body.color, '#10b981');
  assert.equal(generatedColor, '#10b981');
});
