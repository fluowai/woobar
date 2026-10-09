import net from 'net';

const ESC = 0x1b;
const GS = 0x1d;

function command(...bytes: number[]) { return Buffer.from(bytes); }
function text(value: string) { return Buffer.from(`${value}\n`, 'utf8'); }

function qrCode(value: string, size = 7) {
  const data = Buffer.from(value, 'utf8');
  const length = data.length + 3;
  const pL = length & 0xff;
  const pH = (length >> 8) & 0xff;
  return Buffer.concat([
    command(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),
    command(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(16, size))),
    command(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31),
    command(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30), data,
    command(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),
  ]);
}

export type PrintDocument = {
  establishment: string;
  title: string;
  subtitle?: string;
  code?: string;
  qrValue?: string;
  lines?: Array<{ label: string; value?: string }>;
  footer?: string;
};

export function buildReceipt(doc: PrintDocument, paperWidth = 80) {
  const columns = paperWidth === 58 ? 32 : 48;
  const divider = '-'.repeat(columns);
  const chunks: Buffer[] = [
    command(ESC, 0x40),
    command(ESC, 0x61, 0x01),
    command(ESC, 0x45, 0x01),
    command(GS, 0x21, 0x11),
    text(doc.establishment),
    command(GS, 0x21, 0x00),
    text(doc.title),
  ];
  if (doc.subtitle) chunks.push(text(doc.subtitle));
  chunks.push(text(divider));
  for (const line of doc.lines || []) chunks.push(text(line.value ? `${line.label}: ${line.value}` : line.label));
  if (doc.code) {
    chunks.push(text(divider), command(ESC, 0x45, 0x01), command(GS, 0x21, 0x11), text(doc.code), command(GS, 0x21, 0x00), command(ESC, 0x45, 0x00));
  }
  if (doc.qrValue) chunks.push(text(''), qrCode(doc.qrValue, paperWidth === 58 ? 6 : 8), text(''));
  chunks.push(text(doc.footer || 'Apresente este comprovante para validacao.'), text(''), text(''), command(GS, 0x56, 0x42, 0x00));
  return Buffer.concat(chunks);
}

export function sendToPrinter(host: string, port: number, data: Buffer, timeoutMs = 5000) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => socket.destroy(new Error('Tempo limite ao conectar na impressora')), timeoutMs);
    socket.once('connect', () => socket.end(data));
    socket.once('error', error => { clearTimeout(timer); reject(error); });
    socket.once('close', hadError => { clearTimeout(timer); if (!hadError) resolve(); });
  });
}
