const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Direct Puppeteer to store Chrome inside the project directory
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};