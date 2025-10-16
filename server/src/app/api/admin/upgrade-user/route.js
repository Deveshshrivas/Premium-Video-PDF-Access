import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

// Temporary admin route to manually upgrade users for testing
export async function POST(request) {
  try {
    await dbConnect();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Manually set premium status
    user.subscription = {
      status: 'active',
      stripeCustomerId: 'manual_upgrade',
      stripeSubscriptionId: 'manual_upgrade',
      stripePriceId: process.env.STRIPE_PRICE_ID,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false
    };

    await user.save();

    return NextResponse.json({ 
      message: 'User upgraded to premium',
      user: {
        email: user.email,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
