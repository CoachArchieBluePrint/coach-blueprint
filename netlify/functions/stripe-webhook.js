const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const data = stripeEvent.data.object;

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const userId = data.metadata?.userId;
        if (userId) {
          await sb.from('user_profiles')
            .update({ is_premium: true, stripe_customer_id: data.customer })
            .eq('id', userId);
          console.log(`User ${userId} upgraded to premium`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Subscription cancelled — downgrade user
        const customerId = data.customer;
        if (customerId) {
          await sb.from('user_profiles')
            .update({ is_premium: false })
            .eq('stripe_customer_id', customerId);
          console.log(`Customer ${customerId} downgraded`);
        }
        break;
      }
      case 'invoice.payment_failed': {
        // Payment failed — optionally notify or downgrade
        console.log('Payment failed for customer:', data.customer);
        break;
      }
    }
  } catch (err) {
    console.error('Handler error:', err.message);
    return { statusCode: 500, body: 'Internal error' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
