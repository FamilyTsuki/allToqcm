import QRCode from 'qrcode';

export class QRCodeService {
  async generateDataUrl(content, options = {}) {
    const defaultOptions = {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      ...options,
    };
    return QRCode.toDataURL(content, defaultOptions);
  }
}
