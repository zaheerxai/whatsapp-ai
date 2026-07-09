const { getRecentMessages } = require('../db/messages');
const { ask } = require('../llm/client');

module.exports = async function summarize(groupId, args) {
  const n = parseInt(args[0], 10) || 50;
  const messages = await getRecentMessages(groupId, n);
  if (messages.length === 0) return 'No messages logged yet — I need some chat history first.';

  const transcript = messages
    .map((m) => `${m.author_name || m.author}: ${m.body}`)
    .join('\n');

  return ask(
    'You summarize WhatsApp group chats. Be concise. Use bullet points for distinct topics.',
    `Summarize this conversation:\n\n${transcript}`
  );
};
