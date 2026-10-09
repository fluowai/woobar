import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { logger } from '../../lib/logger.js';
import QRCode from 'qrcode';
import db from '../../db/schema.js';

let WA: any = null;
let sock: any = null;
let connectionStatus: string = 'disconnected';
let currentQR: string | null = null;
let qrDataUrl: string | null = null;
let chats: any[] = [];
let messages: Record<string, any[]> = {};
let onUpdate: ((data: any) => void) | null = null;

const SESSION_DIR = path.resolve(import.meta.dirname, '../../../data/baileys-session');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

export function setUpdateCallback(cb: (data: any) => void) {
  onUpdate = cb;
}

function broadcast(data: any) {
  if (onUpdate) onUpdate(data);
  try {
    // Sessão Baileys é única — associa o broadcast ao tenant do canal WhatsApp ativo
    const channel = db.prepare("SELECT establishment_id FROM channels WHERE type = 'whatsapp' AND active = 1 LIMIT 1").get() as any;
    const wss = (globalThis as any).broadcastWS;
    if (wss && channel?.establishment_id) wss({ type: 'wa_update', ...data }, channel.establishment_id);
  } catch {}
}

function addSystemMessage(jid: string, text: string) {
  if (!messages[jid]) messages[jid] = [];
  messages[jid].push({
    key: { id: uuid(), remoteJid: jid, fromMe: true },
    message: { conversation: text },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Sistema',
    _system: true,
  });
}

function formatMessage(msg: any): any {
  const key = msg.key || {};
  const msgData = msg.message || {};
  const conv = msgData.conversation || '';
  const extended = msgData.extendedTextMessage?.text || '';
  const image = msgData.imageMessage;
  const video = msgData.videoMessage;
  const audio = msgData.audioMessage;
  const document = msgData.documentMessage;
  const caption = image?.caption || video?.caption || '';
  const text = conv || extended || caption || '';

  let type = 'text';
  let mediaUrl = null;
  if (image) { type = 'image'; mediaUrl = image.url; }
  else if (video) { type = 'video'; mediaUrl = video.url; }
  else if (audio) { type = 'audio'; mediaUrl = audio.url; }
  else if (document) { type = 'document'; mediaUrl = document.url; }

  return {
    id: key.id,
    remoteJid: key.remoteJid,
    fromMe: !!key.fromMe,
    participant: key.participant || key.remoteJid,
    pushName: msg.pushName || '',
    text,
    type,
    mediaUrl,
    timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
    raw: msg,
  };
}

function updateChatList() {
  const chatList = Object.entries(messages)
    .filter(([jid]) => jid.includes('@s.whatsapp.net') || jid.includes('@g.us'))
    .map(([jid, msgs]) => {
      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter(m => !m.key.fromMe).length;
      const name = lastMsg?.pushName || jid.split('@')[0];
      return {
        jid,
        name,
        lastMessage: lastMsg ? formatMessage(lastMsg).text : '',
        lastTime: lastMsg ? (Number(lastMsg.messageTimestamp) || 0) * 1000 : 0,
        unread,
        isGroup: jid.includes('@g.us'),
      };
    })
    .sort((a, b) => b.lastTime - a.lastTime);
  chats = chatList;
  broadcast({ type: 'chats', chats: chatList });
}

export async function connect() {
  if (sock) {
    logger.info('WhatsApp já conectado');
    return;
  }

  try {
    WA = await import('@whiskeysockets/baileys');
    const { makeWASocket, useMultiFileAuthState, DisconnectReason } = WA;

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: (await import('pino')).default({ level: 'silent' }),
      browser: ['Woobar', 'Chrome', '1.0.0'],
      // Histórico completo estoura memória em produção
      syncFullHistory: false,
    });

    connectionStatus = 'connecting';

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        try {
          qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        } catch {}
        connectionStatus = 'qr';
        broadcast({ type: 'qr', qr: qrDataUrl });
        logger.info('WhatsApp QR code gerado');
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQR = null;
        qrDataUrl = null;
        logger.info('WhatsApp conectado!');

        const user = sock.user;
        broadcast({
          type: 'connected',
          user: { id: user?.id, name: user?.name || user?.verifiedName },
        });

        await loadExistingChats();
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        logger.info('WhatsApp desconectado', { shouldReconnect });

        broadcast({ type: 'disconnected', reason: 'close' });

        if (shouldReconnect) {
          setTimeout(() => {
            sock = null;
            connect();
          }, 5000);
        } else {
          sock = null;
          connectionStatus = 'logged_out';
          broadcast({ type: 'logged_out' });
        }
      }
    });

    sock.ev.on('messages.upsert', async (upsert: any) => {
      const { messages: newMsgs, type } = upsert;
      if (!newMsgs || type !== 'notify') return;

      for (const msg of newMsgs) {
        const key = msg.key || {};
        const jid = key.remoteJid;
        if (!jid) continue;
        if (!jid.includes('@s.whatsapp.net') && !jid.includes('@g.us')) continue;

        if (!messages[jid]) messages[jid] = [];
        messages[jid].push(msg);
        // Limita memória: mantém apenas as últimas 500 mensagens por conversa
        if (messages[jid].length > 500) messages[jid] = messages[jid].slice(-500);

        const formatted = formatMessage(msg);
        broadcast({
          type: 'new_message',
          jid,
          message: formatted,
        });

        updateChatList();
      }
    });

    sock.ev.on('messaging-history.set', ({ chats: historyChats, messages: historyMessages }: any) => {
      logger.info('Histórico de mensagens carregado', {
        chats: historyChats?.length,
        messages: historyMessages?.length,
      });

      if (historyMessages) {
        for (const msg of historyMessages) {
          const jid = msg.key?.remoteJid;
          if (!jid) continue;
          if (!messages[jid]) messages[jid] = [];
          messages[jid].push(msg);
        }
      }

      updateChatList();
    });

  } catch (err: any) {
    logger.error('Erro ao conectar WhatsApp', { error: err.message });
    connectionStatus = 'error';
    broadcast({ type: 'error', message: err.message });
  }
}

async function loadExistingChats() {
  try {
    if (!sock) return;
    const existingChats = await sock.chats.all();
    logger.info('Carregando chats existentes', { count: existingChats.length });

    for (const chat of existingChats) {
      const jid = chat.id;
      try {
        const msgs = await sock.loadMessages(jid, 50);
        if (msgs?.length) {
          if (!messages[jid]) messages[jid] = [];
          for (const m of msgs) {
            if (!messages[jid].find((x: any) => x.key?.id === m.key?.id)) {
              messages[jid].push(m);
            }
          }
        }
      } catch {}
    }

    updateChatList();
  } catch (err: any) {
    logger.error('Erro ao carregar chats', { error: err.message });
  }
}

export async function sendMessage(jid: string, text: string): Promise<boolean> {
  if (!sock || connectionStatus !== 'connected') return false;
  try {
    const sent = await sock.sendMessage(jid, { text });
    if (sent) {
      if (!messages[jid]) messages[jid] = [];
      messages[jid].push(sent);
      updateChatList();
      return true;
    }
    return false;
  } catch (err: any) {
    logger.error('Erro ao enviar mensagem', { error: err.message });
    return false;
  }
}

export async function getMessages(jid: string, limit = 100): Promise<any[]> {
  if (messages[jid]) {
    return messages[jid]
      .slice(-limit)
      .map(formatMessage)
      .reverse();
  }

  if (sock && connectionStatus === 'connected') {
    try {
      const msgs = await sock.loadMessages(jid, limit);
      if (msgs?.length) {
        messages[jid] = msgs;
        return msgs.map(formatMessage).reverse();
      }
    } catch {}
  }

  return [];
}

export function getChats() {
  return chats;
}

export function getStatus() {
  return {
    status: connectionStatus,
    hasQr: !!qrDataUrl,
    user: sock?.user ? { id: sock.user.id, name: sock.user.name || sock.user.verifiedName } : null,
  };
}

export function getQR() {
  return qrDataUrl;
}

export async function disconnect() {
  if (sock) {
    try {
      sock.end(new Error('Desconectado pelo usuário'));
    } catch {}
    sock = null;
  }
  connectionStatus = 'disconnected';
  currentQR = null;
  qrDataUrl = null;
  chats = [];
  messages = {};
  broadcast({ type: 'disconnected', reason: 'user' });
}

export async function resetSession() {
  await disconnect();
  const files = fs.readdirSync(SESSION_DIR);
  for (const f of files) {
    fs.unlinkSync(path.join(SESSION_DIR, f));
  }
  connectionStatus = 'disconnected';
  broadcast({ type: 'session_reset' });
  await connect();
}

export function isConnected(): boolean {
  return connectionStatus === 'connected';
}
