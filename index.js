const config = require('./src/config');
const app = require('./src/server/app');
const { client, restart } = require('./src/whatsapp/client');

app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));


client.initialize();

// whatsapp-web.js runs WhatsApp Web inside a real headless browser page.
// WhatsApp's own client-side JS occasionally reloads that page — reconnects,
// internal state syncs, network hiccups — and when it does, Puppeteer throws
// "Execution context was destroyed, most likely because of a navigation."
// This is a known, currently-unresolved flakiness in whatsapp-web.js (widely
// reported, including specifically with RemoteAuth reconnects), not a bug in
// this codebase, and it surfaces as an unhandled rejection/exception rather
// than a catchable client event.
//
// After an abrupt disconnect (network drop, laptop sleep), WhatsApp's own
// client does several internal reload/resync passes before settling — each
// one can trip this error. Restarting immediately and unconditionally stacks
// our restarts on top of that churn with no brakes, which is exactly how a
// transient reconnect turns into an unbounded restart loop. On a memory-
// constrained host (Render's free tier), a tight loop risks leaking Chromium
// processes faster than they're released, compounding into an OOM crash
// that's harder to recover from than the original error.
//
// Mitigation: a short delay before restarting (lets the old browser process
// actually release resources) and a hard cap — if it's still crash-looping
// after several attempts in a short window, that's a genuine stuck state,
// not a normal reconnect, and we exit loudly rather than loop forever.
//
// This is still a blunt instrument below the cap — it restarts on ANY
// uncaught error anywhere, not just this specific Puppeteer crash. That
// could mask a real bug elsewhere by quietly restarting instead of
// surfacing it. Watch the logs; don't assume every restart is a network blip.
let restarting = false;
let restartTimestamps = [];
const MAX_RESTARTS_PER_WINDOW = 5;
const RESTART_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const RESTART_DELAY_MS = 4000; // let the old browser process actually release

async function recoverFromCrash(label, err) {
  if (restarting) return; // noise from the same crash cascade — ignore silently

  const now = Date.now();
  restartTimestamps = restartTimestamps.filter((t) => now - t < RESTART_WINDOW_MS);

  if (restartTimestamps.length >= MAX_RESTARTS_PER_WINDOW) {
    console.error(
      `${label} — ${MAX_RESTARTS_PER_WINDOW} restarts in ${RESTART_WINDOW_MS / 1000}s. ` +
      'This looks like a genuine stuck state, not a transient reconnect. Exiting so the ' +
      'process manager (Render, or a manual restart locally) starts fully clean instead ' +
      'of looping forever.'
    );
    process.exit(1);
  }

  console.error(`${label} — restarting WhatsApp client in ${RESTART_DELAY_MS}ms:`, err?.message || err);
  restartTimestamps.push(now);
  restarting = true;
  try {
    await new Promise((r) => setTimeout(r, RESTART_DELAY_MS));
    await restart();
  } catch (e) {
    console.error('Restart attempt itself failed:', e.message);
  } finally {
    restarting = false;
  }
}

process.on('unhandledRejection', (reason) => recoverFromCrash('Unhandled rejection', reason));
process.on('uncaughtException', (err) => recoverFromCrash('Uncaught exception', err));

process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await client.destroy();
  process.exit(0);
});