// Render's build cache can persist a half-downloaded Chrome binary from an
// earlier interrupted build. Puppeteer's installer sees the folder already
// exists and skips re-downloading it, even though the executable inside is
// missing. Wiping this directory before every install forces a genuinely
// clean download every time, regardless of what the cache restored.
const fs = require('fs');
const os = require('os');
const path = require('path');

const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer');

try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log(`Cleared ${cacheDir} (if it existed) before installing Chrome.`);
} catch (e) {
    console.log(`Nothing to clear at ${cacheDir}, or clearing failed harmlessly:`, e.message);
}