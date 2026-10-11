import test from 'node:test';
import assert from 'node:assert/strict';
import { QRCodeService } from '../src/infrastructure/services/QRCodeService.js';

test('QRCodeService generates a valid data URL by default', async () => {
  const service = new QRCodeService();
  const url = 'http://localhost:3002/?survey=test-id-123';
  const qrCodeDataUrl = await service.generateDataUrl(url);

  assert.ok(qrCodeDataUrl);
  assert.equal(typeof qrCodeDataUrl, 'string');
  assert.ok(qrCodeDataUrl.startsWith('data:image/png;base64,'));
  assert.ok(qrCodeDataUrl.length > 100);
});

test('QRCodeService supports custom color options', async () => {
  const service = new QRCodeService();
  const url = 'http://localhost:3002/?survey=custom-color';

  const defaultQr = await service.generateDataUrl(url);
  const blueQr = await service.generateDataUrl(url, {
    color: { dark: '#3b82f6', light: '#ffffff' },
  });
  const redQr = await service.generateDataUrl(url, {
    color: { dark: '#ef4444', light: '#ffffff' },
  });

  assert.ok(blueQr.startsWith('data:image/png;base64,'));
  assert.ok(redQr.startsWith('data:image/png;base64,'));
  assert.notEqual(defaultQr, blueQr);
  assert.notEqual(blueQr, redQr);
});

test('QRCodeService supports custom dimensions and margins', async () => {
  const service = new QRCodeService();
  const url = 'http://localhost:3002/?survey=dimensions';

  const smallQr = await service.generateDataUrl(url, { width: 128, margin: 1 });
  const largeQr = await service.generateDataUrl(url, { width: 512, margin: 4 });

  assert.ok(smallQr.startsWith('data:image/png;base64,'));
  assert.ok(largeQr.startsWith('data:image/png;base64,'));
  assert.notEqual(smallQr, largeQr);
});

test('QRCodeService handles long complex URLs without error', async () => {
  const service = new QRCodeService();
  const longUrl =
    'https://example.com/very/long/path/with/deep/nesting?param1=value1&param2=value2&signature=abcdef1234567890';
  const qr = await service.generateDataUrl(longUrl);

  assert.ok(qr.startsWith('data:image/png;base64,'));
});
