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
    backupSyncIntervalMs: 300000
  }),
  puppeteer: {
    headless: true,
    // We force it to look in the local .cache folder we created at startup
    executablePath: process.env.CHROME_PATH || '/opt/render/project/src/.chrome/chrome-linux/chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  latestQr = qr;
  console.log('QR ready — visit /qr to scan');
});

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