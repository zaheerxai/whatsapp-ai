/**
 * @type {import("puppeteer").Configuration}
 */
const path = require('path');

module.exports = {
  // Cache directory where Chrome will be downloaded
  // Render environment uses /opt/render/project/src
  cacheDirectory: process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.puppeteer'),
  
  // Don't set executablePath — let Puppeteer auto-discover Chrome in the cache directory
  // This prevents hardcoded version mismatches
  
  // Download Chrome when installing (important for Render and local development)
  skipDownload: false,
  
  // Verify downloaded binaries
  verifyDownloads: true,
  
  // Log for debugging
  logLevel: 'info'
};
