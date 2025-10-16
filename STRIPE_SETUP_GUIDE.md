# 🚀 Stripe Setup Guide - Step by Step

Follow these steps to get your Stripe keys and complete the payment integration.

---

## Step 1: Create Stripe Account (or Login)

1. Visit: https://dashboard.stripe.com/register
2. Sign up with your email
3. Complete account verification
4. Switch to **Test Mode** (toggle in top right)

---

## Step 2: Get API Keys

### Location: https://dashboard.stripe.com/test/apikeys

1. Click on "Developers" in left sidebar
2. Click on "API keys"
3. You'll see two keys:

**Publishable Key** (starts with `pk_test_`):
```
pk_test_51Xxxxx...
```

**Secret Key** (starts with `sk_test_`) - Click "Reveal test key":
```
sk_test_51Xxxxx...
```

### Update `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_51Xxxxx...
STRIPE_PUBLISHABLE_KEY=pk_test_51Xxxxx...
```

---

## Step 3: Create Product & Price

### Location: https://dashboard.stripe.com/test/products

1. Click "Products" in left sidebar
2. Click "+ Add product" button
3. Fill in details:

```
Product Name: Premium Video & PDF Access
Description: Unlimited video playback and full PDF access
```

4. Click "Add pricing"
5. Pricing details:

```
Pricing Model: Standard pricing
Price: 9.99 USD
Billing Period: Monthly
Payment type: Recurring
```

6. Click "Add product"
7. **Copy the Price ID** (starts with `price_`):
```
price_1Xxxxx...
```

### Update `.env.local`:
```env
STRIPE_PRICE_ID=price_1Xxxxx...
```

---

## Step 4: Create Webhook

### Location: https://dashboard.stripe.com/test/webhooks

1. Click "Webhooks" in left sidebar (under Developers)
2. Click "+ Add endpoint" button
3. Endpoint details:

```
Endpoint URL: http://localhost:3002/api/stripe/webhook
Description: Payment webhook for subscription events
```

4. Click "Select events"
5. Select these events:

```
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

6. Click "Add events"
7. Click "Add endpoint"
8. **Copy the Signing secret** (starts with `whsec_`):
```
whsec_Xxxxx...
```

### Update `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_Xxxxx...
```

---

## Step 5: Verify `.env.local` Configuration

Your final `.env.local` should look like this:

```env

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51Xxxxx...
STRIPE_PUBLISHABLE_KEY=pk_test_51Xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_Xxxxx...
STRIPE_PRICE_ID=price_1Xxxxx...

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## Step 6: Restart Server

After updating `.env.local`, restart your Next.js server:

```bash
cd server
npm run dev
```

The server will automatically load the new environment variables.

---

## Step 7: Test Payment Flow

### Test Cards (Use in Stripe Checkout):

**Successful Payment**:
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

**Declined Card**:
```
Card Number: 4000 0000 0000 0002
```

**Requires Authentication**:
```
Card Number: 4000 0025 0000 3155
```

### Testing Steps:

1. **Open App**: http://localhost:5173
2. **Login** with your account
3. **Upload a video** (any video file)
4. **Watch for 10 seconds** → Video should pause
5. **Click "Upgrade to Premium"** button
6. **Pricing modal opens** → Click "Upgrade to Premium"
7. **Redirected to Stripe Checkout**
8. **Enter test card**: 4242 4242 4242 4242
9. **Complete payment**
10. **Redirected back to app** with success message
11. **Refresh page** → You should see "⭐ Premium" badge
12. **Test unlimited access**:
    - Upload new video → No time limit
    - Upload PDF → All pages accessible

---

## Step 8: Test Webhook (Optional but Recommended)

### Check Webhook is Working:

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. You should see recent events listed
4. Status should be "Succeeded" (green checkmark)

### If Webhook Fails:

**Common Issues**:
- Server not running (start with `npm run dev`)
- Wrong URL (should be `http://localhost:3002/api/stripe/webhook`)
- Wrong webhook secret in `.env.local`

**Debug**:
1. Check server console for webhook errors
2. Check Stripe Dashboard → Webhooks → Event logs
3. Look for detailed error messages

---

## Step 9: Test Subscription Management

1. After subscribing, click "Manage Subscription" in pricing modal
2. You'll be redirected to Stripe Customer Portal
3. Try these actions:
   - View invoice
   - Update payment method
   - Cancel subscription (won't charge you in test mode)

---

## Troubleshooting

### "No checkout URL received"
```bash
# Check server logs
# Verify STRIPE_SECRET_KEY and STRIPE_PRICE_ID are set
# Check if Stripe package is installed: npm list stripe
```

### "Webhook signature verification failed"
```bash
# Verify STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
# Check webhook endpoint URL is correct
# Ensure server is running on port 3002
```

### "Payment succeeded but not upgraded"
```bash
# Check webhook events in Stripe Dashboard
# Look for errors in server console
# Verify MongoDB connection is working
# Check user subscription status in database
```

### "Upgrade button not showing premium access"
```bash
# Refresh the page (Ctrl+R or Cmd+R)
# Check user object has subscription.status = 'active'
# Verify /api/auth/verify returns subscription data
# Check browser console for errors
```

---

## Production Setup (When Ready)

### Switch to Live Mode:

1. In Stripe Dashboard, toggle "Test mode" to OFF
2. Get **live** API keys from: https://dashboard.stripe.com/apikeys
3. Create **live** product and webhook
4. Update production `.env` with live keys
5. **Important**: Never commit `.env.local` to git!

---

## Quick Reference

| What | Where to Get It |
|------|----------------|
| API Keys | https://dashboard.stripe.com/test/apikeys |
| Create Product | https://dashboard.stripe.com/test/products |
| Setup Webhook | https://dashboard.stripe.com/test/webhooks |
| Test Cards | https://stripe.com/docs/testing |
| View Payments | https://dashboard.stripe.com/test/payments |
| View Customers | https://dashboard.stripe.com/test/customers |

---

## Need Help?

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Server Logs**: Check terminal running `npm run dev`
- **Browser Console**: Press F12 in browser

---

## Summary Checklist

- [ ] Created Stripe account (test mode)
- [ ] Got API keys (Secret & Publishable)
- [ ] Created Premium product ($9.99/month)
- [ ] Got Price ID
- [ ] Created webhook endpoint
- [ ] Got Webhook Secret
- [ ] Updated `.env.local` with all keys
- [ ] Restarted server
- [ ] Tested payment with test card (4242...)
- [ ] Verified premium access works
- [ ] Tested webhook events in Stripe Dashboard

---

**Ready to accept payments! 🎉**

Once you complete these steps, your app will have a fully functional subscription system.
