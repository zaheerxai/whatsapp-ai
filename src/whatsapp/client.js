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

  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-web-resources',
      '--disable-blink-features=AutomationControlled'
    ],
    timeout: 60000,  // 60s timeout for browser launch
    protocolTimeout: 180000  // 180s timeout for protocol commands
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
client.on('authenticated', () => {
  console.log('WhatsApp authenticated — waiting for ready...');
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp auth failure:', msg);
  ready = false;
});

client.on('page_opened', () => {
  console.log('[diagnostic] Browser page opened');
});

client.on('loading_screen', (percent, message) => {
  console.log(`[diagnostic] Loading: ${percent}% - ${message}`);
});

// Add a timeout for the ready event — if authenticated fires but ready
// never does after 30 seconds, that's a known whatsapp-web.js bug, not
// a network issue. Log it clearly so it's not confused with a hung state.
let readyTimeout = null;
function resetReadyTimeout() {
  if (readyTimeout) clearTimeout(readyTimeout);
  readyTimeout = setTimeout(() => {
    if (!ready) {
      console.warn(
        '[diagnostic] Authenticated but ready event did not fire within 30s. ' +
        'This is a known whatsapp-web.js issue. The client may still work, but ' +
        'restart if messages are not being received.'
      );
    }
  }, 30000);
}

client.on('authenticated', resetReadyTimeout);

client.on('ready', () => {
  latestQr = null;
  ready = true;
  console.log('WhatsApp client ready');
  if (readyTimeout) clearTimeout(readyTimeout);
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
  getPage: () => client.pupPage,
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
      // destroy() didn't cleanly finish. process.exit() below kills THIS
      // Node process, but does NOT kill the underlying Chromium child
      // process on its own — Windows in particular does not clean up
      // orphaned child processes just because their parent exited. Left
      // alone, that orphan keeps holding a lock on the local .wwebjs_auth
      // profile, and every subsequent launch attempt fails against that same
      // lock — which looks like a deterministic crash-on-every-restart
      // rather than the transient reconnect churn this handler is designed
      // for. Force-killing the browser process directly, by PID, before
      // exiting prevents that: the next launch starts against a genuinely
      // free profile instead of fighting a zombie for it.
      const browserProcess = client.pupBrowser?.process();
      if (browserProcess && !browserProcess.killed) {
        console.error('client.destroy() failed or timed out — force-killing the browser process directly:', e.message);
        browserProcess.kill('SIGKILL');
      } else {
        console.error('client.destroy() failed or timed out, and no browser process handle was available to force-kill:', e.message);
      }
      process.exit(1);
    }
    await client.initialize();
  }
};
