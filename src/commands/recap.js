const { getRecentMessages } = require('../db/messages');

module.exports = async function recap(groupId) {
  const messages = await getRecentMessages(groupId, 50);
  if (messages.length === 0) return 'No recent activity logged yet.';
  const speakers = [...new Set(messages.map((m) => m.author_name || m.author))];
  return `Active in the last ${messages.length} messages:\n${speakers.join('\n')}`;
};
