module.exports = async function help() {
  return [
    'Available commands:',
    '!summarize [n] — summarize the last n messages (default 50)',
    '!ask <question> — ask something about recent chat',
    '!recap — list who has been active recently',
    "!groupid — show this chat's WhatsApp ID (setup only)",
    '!help — show this message'
  ].join('\n');
};
