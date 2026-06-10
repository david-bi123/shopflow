import QRCode from 'qrcode'

export async function generateQRCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

export async function generateQRCodeBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: 200,
    margin: 2,
    type: 'png',
  })
}
