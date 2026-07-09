const config = require('./src/config');
const app = require('./src/server/app');
const { client } = require('./src/whatsapp/client');

app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));

client.initialize();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await client.destroy();
  process.exit(0);
});
