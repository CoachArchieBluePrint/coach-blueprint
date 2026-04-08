// netlify/functions/chat.js

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_SYSTEM = `You are Archie the Architect, a warm, casual, motivating AI life coach.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { messages, system, contextNote } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'messages array required' }) };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: system || (DEFAULT_SYSTEM + (contextNote || '')),
      messages: messages.slice(-20),
    });

    const reply = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ reply }) };

  } catch (err) {
    console.error('Anthropic error:', err.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'AI service error — please try again' }) };
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
