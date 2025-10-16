import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here', {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret';

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    await dbConnect();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('✅ Payment succeeded:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  // Retrieve the subscription
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  user.subscription = {
    status: subscription.status,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  await user.save();
  console.log('✅ Subscription created for user:', user.email);
}

async function handleSubscriptionUpdate(subscription) {
  const user = await User.findOne({ 'subscription.stripeCustomerId': subscription.customer });
  if (!user) {
    console.error('User not found for customer:', subscription.customer);
    return;
  }

  user.subscription.status = subscription.status;
  user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

  if (subscription.cancel_at_period_end) {
    user.subscription.canceledAt = new Date();
  }

  await user.save();
  console.log('✅ Subscription updated for user:', user.email, '| Status:', subscription.status);
}

async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({ 'subscription.stripeCustomerId': subscription.customer });
  if (!user) {
    console.error('User not found for customer:', subscription.customer);
    return;
  }

  user.subscription.status = 'free';
  user.subscription.canceledAt = new Date();

  await user.save();
  console.log('✅ Subscription canceled for user:', user.email);
}

async function handlePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const user = await User.findOne({ 'subscription.stripeCustomerId': invoice.customer });
  
  if (user) {
    user.subscription.status = 'past_due';
    await user.save();
    console.log('⚠️ Payment failed for user:', user.email);
  }
}
