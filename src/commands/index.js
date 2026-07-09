const summarize = require('./summarize');
const ask = require('./ask');
const recap = require('./recap');
const help = require('./help');
const groupid = require('./groupid');

const registry = { summarize, ask, recap, help, groupid };

function parseCommand(body) {
  if (!body.startsWith('!')) return null;
  const [raw, ...args] = body.slice(1).trim().split(/\s+/);
  return { name: raw.toLowerCase(), args };
}

async function dispatch(body, groupId, chat) {
  const parsed = parseCommand(body);
  if (!parsed) return null;
  const handler = registry[parsed.name];
  if (!handler) return null;
  return handler(groupId, parsed.args, chat);
}

module.exports = { dispatch };
