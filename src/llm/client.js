const OpenAI = require('openai');
const config = require('../config');

const client = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1'
});

const MODEL = 'llama-3.3-70b-versatile';

async function ask(systemPrompt, userPrompt, maxTokens = 500) {
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
  return res.choices[0]?.message?.content ?? '';
}

module.exports = { ask };
