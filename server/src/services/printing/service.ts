import { v4 as uuid } from 'uuid';
import db from '../../db/schema.js';
import { buildReceipt, PrintDocument, sendToPrinter } from './escpos.js';

export type PrinterConfig = { establishment_id: string; name: string; host: string; port: number; paper_width: number; auto_print_tokens: number; auto_print_tickets: number; enabled: number };

export function getPrinterConfig(establishmentId: string) {
  return db.prepare('SELECT * FROM printer_configs WHERE establishment_id = ?').get(establishmentId) as PrinterConfig | undefined;
}

export async function queuePrint(establishmentId: string, type: string, referenceId: string | null, document: PrintDocument) {
  const id = uuid();
  db.prepare('INSERT INTO print_jobs (id, establishment_id, type, reference_id, payload_json) VALUES (?,?,?,?,?)')
    .run(id, establishmentId, type, referenceId, JSON.stringify(document));
  const config = getPrinterConfig(establishmentId);
  if (!config?.enabled) {
    db.prepare("UPDATE print_jobs SET status = 'failed', error = ? WHERE id = ?").run('Impressao desativada', id);
    return { id, status: 'failed', error: 'Impressao desativada' };
  }
  if ((config as any).delivery_mode !== 'direct') {
    return { id, status: 'pending' };
  }
  if (!config.host) {
    db.prepare("UPDATE print_jobs SET status = 'failed', error = ? WHERE id = ?").run('IP da impressora nao configurado', id);
    return { id, status: 'failed', error: 'IP da impressora nao configurado' };
  }
  try {
    db.prepare("UPDATE print_jobs SET status = 'printing', attempts = attempts + 1 WHERE id = ?").run(id);
    await sendToPrinter(config.host, Number(config.port || 9100), buildReceipt(document, Number(config.paper_width || 80)));
    db.prepare("UPDATE print_jobs SET status = 'printed', printed_at = datetime('now'), error = NULL WHERE id = ?").run(id);
    return { id, status: 'printed' };
  } catch (error: any) {
    const message = error?.message || 'Falha de comunicacao com a impressora';
    db.prepare("UPDATE print_jobs SET status = 'failed', error = ? WHERE id = ?").run(message, id);
    return { id, status: 'failed', error: message };
  }
}
