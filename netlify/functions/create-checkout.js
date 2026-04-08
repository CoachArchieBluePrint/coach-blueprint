const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { priceId, userId, email } = JSON.parse(event.body || '{}');
    if (!priceId) throw new Error('Missing priceId');

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const origin = event.headers.origin || event.headers.referer || 'https://your-site.netlify.app';
    const baseUrl = origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?upgraded=true`,
      cancel_url: `${baseUrl}/`,
      customer_email: email || undefined,
      metadata: { userId: userId || '' },
      subscription_data: {
        metadata: { userId: userId || '' },
      },
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Checkout error:', err.message);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
