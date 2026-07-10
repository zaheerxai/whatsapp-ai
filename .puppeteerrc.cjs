const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to a folder inside the project root.
    // This guarantees Render packages the downloaded browser when deploying.
    cacheDirectory: join(__dirname, '.puppeteer-cache'),
};