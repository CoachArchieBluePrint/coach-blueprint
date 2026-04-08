// netlify/functions/chat.js
// This runs on Netlify's servers. Your API key never reaches the browser.

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM = `You are Archie the Architect, a warm, casual, motivating AI life coach. Help users design their week, set meaningful goals, track progress, and explore self-improvement modules.

Tone: friendly, encouraging, never preachy. Use light markdown — **bold** for key points, ## for section headers, bullet lists where helpful. Keep responses focused and scannable.

CORE GOAL TYPES ONLY: Fitness, Personal Development, Work/Productivity, Social, Misc.

WEEKLY DASHBOARD:
- Ask about Mon→Sun commitments first, then layer goals on top
- For each goal: type, specifics (distance/reps/pages), frequency
- Completion is binary: done or not done
- Master Streak: 1 goal missed = streak continues; 2 missed = streak freezes; 3+ missed = streak resets to 0
- When streak changes state clearly: "Your master streak is now X days" OR "Streak frozen" OR "Streak reset to 0"

BONUS MODULES - stay focused on whichever module is active:
- Budget: income to expenses to savings/debts to monthly budget + 90-day plan
- Running: goals, schedule, pace, weekly running plan
- Workout: goals, equipment, days, structured routine with sets/reps/rest
- Meal Planner: current diet, restrictions, goals, weekly meal plan + macro tips
- Hobby: hobby, skill level, time available, practice schedule + milestones
- Film & Books: tastes, goals, curated recommendations + tracking
- Restaurants & Activities: preferences, budget, suggestions + scheduling

Always ask questions first. Generate plans only after gathering enough input.`;

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
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { messages, contextNote } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'messages array is required' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM + (contextNote || ''),
      messages: messages.slice(-20),
    });

    const reply = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error('Anthropic API error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'AI service error - please try again' }),
    };
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
