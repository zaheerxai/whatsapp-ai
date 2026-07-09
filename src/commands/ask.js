const { getRecentMessages } = require('../db/messages');
const { ask } = require('../llm/client');

module.exports = async function askCommand(groupId, args) {
  const question = args.join(' ').trim();
  if (!question) return 'Usage: !ask <your question>';

  const messages = await getRecentMessages(groupId, 40);
  const context = messages
    .map((m) => `${m.author_name || m.author}: ${m.body}`)
    .join('\n');

  return ask(
    'You answer questions about a WhatsApp group chat using only the provided context. If the answer is not in the context, say so.',
    `Chat context:\n${context}\n\nQuestion: ${question}`
  );
};
