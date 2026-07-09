const express = require('express');
const QRCode = require('qrcode');
const config = require('../config');
const { getQr, isReady } = require('../whatsapp/client');

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'alive', whatsappReady: isReady(), uptime: process.uptime() });
});

app.get('/qr', async (req, res) => {
  if (req.query.key !== config.qrSecret) return res.status(403).send('Forbidden');

  const qr = getQr();
  if (!qr) return res.send('Already authenticated — no QR needed.');

  const img = await QRCode.toDataURL(qr);
  res.send(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif">
    <div style="text-align:center"><h2>Scan with WhatsApp</h2><img src="${img}" /></div>
  </body></html>`);
});

module.exports = app;
