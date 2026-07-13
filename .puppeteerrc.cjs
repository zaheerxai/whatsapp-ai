/**
 * @type {import("puppeteer").Configuration}
 */
const path = require('path');

module.exports = {
  // Cache directory where Chrome will be downloaded
  cacheDirectory: process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.puppeteer'),
  
  // Chrome executable path (will be found in cache directory)
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  
  // Download Chrome when installing (important for Render)
  skipDownload: false,
  
  // Log downloads
  logLevel: 'info'
};
