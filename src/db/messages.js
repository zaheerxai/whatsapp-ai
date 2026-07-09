const { supabase } = require('../whatsapp/supabaseStore');

async function insertMessage({ groupId, author, authorName, body }) {
  const { error } = await supabase.from('messages').insert({
    group_id: groupId,
    author,
    author_name: authorName || null,
    body
  });
  if (error) console.error('insertMessage error:', error.message);
}

async function getRecentMessages(groupId, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getRecentMessages error:', error.message);
    return [];
  }
  return data.reverse(); // chronological order for prompt context
}

module.exports = { insertMessage, getRecentMessages };
