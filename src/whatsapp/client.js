const { Client, RemoteAuth } = require('whatsapp-web.js');
const { SupabaseStore } = require('./supabaseStore');
const { insertMessage } = require('../db/messages');
const { dispatch } = require('../commands');
const config = require('../config');
const { humanDelay } = require('../utils/delay');

let latestQr = null;
let ready = false;

const client = new Client({
  authStrategy: new RemoteAuth({
    store: new SupabaseStore(),
    backupSyncIntervalMs: 300000 // 5 min — must stay above the library's enforced minimum
  }),
  // The {version} token gets substituted by whatsapp-web.js itself with
  // whatever WhatsApp Web version it's actually being served, resolved
  // against an actively-maintained community archive — not a hardcoded pin.
  // A fixed version number here would work today and quietly stop working
  // in a few months as WhatsApp deprecates old web-client versions; this
  // stays current automatically. Mitigates (doesn't guarantee-fix) a known,
  // currently-unresolved whatsapp-web.js bug where 'authenticated' fires but
  // 'ready' never does — see the diagnostic listeners below for confirming
  // whether that's actually what's happening versus a resource issue.
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html'
  },
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  latestQr = qr;
  console.log('QR ready — visit /qr to scan');
});

// These two did not exist before and matter specifically for diagnosing a
// stuck-after-scan state: if 'authenticated' fires but 'ready' never does,
// that's a known upstream whatsapp-web.js bug, not a resource problem — see
// the Known Limitations note on this. If 'authenticated' itself never fires,
// that points elsewhere (network, RAM, or a genuinely broken page load).
client.on('authenticated', () => console.log('WhatsApp authenticated — waiting for ready...'));
client.on('auth_failure', (msg) => console.error('WhatsApp auth failure:', msg));

client.on('ready', () => {
  latestQr = null;
  ready = true;
  console.log('WhatsApp client ready');
});

// Fires whenever RemoteAuth finishes a backup — the real proof persistence
// is working, before you even get to the restart test.
client.on('remote_session_saved', () => console.log('Session backed up to Supabase'));

client.on('disconnected', (reason) => {
  ready = false;
  console.error('WhatsApp client disconnected:', reason);
});

client.on('message', async (msg) => {
  if (msg.fromMe) return;

  const chat = await msg.getChat();

  // Works in any chat, unauthenticated by design — this is how you discover
  // TARGET_GROUP_ID without digging through Render logs.
  if (msg.body.trim().toLowerCase() === '!groupid') {
    await msg.reply(`Chat ID: ${chat.id._serialized}`);
    return;
  }

  if (!chat.isGroup) return;
  if (!config.targetGroupId || chat.id._serialized !== config.targetGroupId) return;

  const contact = await msg.getContact();

  await insertMessage({
    groupId: chat.id._serialized,
    author: msg.author || msg.from,
    authorName: contact.pushname || contact.number,
    body: msg.body
  });

  const reply = await dispatch(msg.body, chat.id._serialized, chat);
  if (reply) {
    await humanDelay();
    await msg.reply(reply);
  }
});

module.exports = {
  client,
  getQr: () => latestQr,
  isReady: () => ready,
  async restart() {
    console.log('Restarting WhatsApp client...');
    try {
      // destroy() on an already-broken browser context can hang instead of
      // throwing — race it against a timeout so a stuck teardown can't stall
      // the restart indefinitely.
      await Promise.race([
        client.destroy(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('destroy() timed out')), 10000))
      ]);
    } catch (e) {
      // If destroy() didn't cleanly finish, the old browser process might
      // still be alive underneath. Initializing a fresh one on top of that
      // risks two live WhatsApp Web connections both feeding events into
      // the same client — i.e. every incoming message answered twice.
      // Safer to give up and exit than gamble on a half-destroyed browser.
      console.error('client.destroy() failed or timed out — exiting rather than risking a duplicate connection:', e.message);
      process.exit(1);
    }
    await client.initialize();
  }
};