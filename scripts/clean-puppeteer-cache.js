// Render's build cache can persist a half-downloaded Chrome binary from an
// earlier interrupted build. Puppeteer's installer sees the folder already
// exists and skips re-downloading it, even though the executable inside is
// missing. Wiping this directory before every install forces a genuinely
// clean download every time, regardless of what the cache restored.
//
// Clears every plausible cache location rather than depending on correctly
// reading PUPPETEER_CACHE_DIR alone — this exact file has already regressed
// once (a later edit silently dropped the env-var check, causing the
// cleanup to target the wrong directory while runtime used the right one).
// Clearing all candidates degrades more gracefully if that happens again:
// worst case it's a few redundant no-ops, not a silent cache mismatch.
const fs = require('fs');
const os = require('os');
const path = require('path');

const candidates = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(os.homedir(), '.cache', 'puppeteer'),
    path.join(process.cwd(), '.puppeteer-cache')
].filter(Boolean);

for (const cacheDir of candidates) {
    try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log(`Cleared ${cacheDir} (if it existed) before installing Chrome.`);
    } catch (e) {
        console.log(`Nothing to clear at ${cacheDir}, or clearing failed harmlessly:`, e.message);
    }
}