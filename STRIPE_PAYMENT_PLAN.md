# 💳 Stripe Payment Integration Plan

## Feature Overview

Implement a subscription system where:
- **Free Users**: 10-second video limit, 5 PDF pages max
- **Premium Users**: Unlimited video playback, full PDF access

---

## Implementation Steps

### 1. Install Stripe Dependencies

```bash
# Server-side
cd server
npm install stripe

# Client-side
cd chunkData
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Environment Variables

Create `.env.local` in server folder:
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID=price_your_price_id
```

### 3. Database Schema Updates

Update `User.js` model:
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subscription: {
    status: { 
      type: String, 
      enum: ['free', 'active', 'canceled', 'past_due'],
      default: 'free'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean
  },
  createdAt: { type: Date, default: Date.now }
});
```

### 4. API Routes to Create

#### `/api/stripe/create-checkout-session` (POST)
- Creates Stripe Checkout session
- Redirects to Stripe payment page

#### `/api/stripe/create-portal-session` (POST)
- Creates customer portal session
- Allows users to manage subscription

#### `/api/stripe/webhook` (POST)
- Handles Stripe webhook events
- Updates user subscription status

#### `/api/user/subscription` (GET)
- Returns current user subscription status

### 5. Client Components to Create

#### `PricingModal.jsx`
- Shows pricing plans
- Free vs Premium comparison
- "Upgrade" button

#### `SubscriptionStatus.jsx`
- Shows current plan
- Manage subscription button
- Cancel/reactivate options

### 6. Access Control Logic

#### VideoPlayer.jsx
```javascript
// Check subscription status
const isPremium = user.subscription?.status === 'active';
const TIME_LIMIT = isPremium ? Infinity : 10;

// Show upgrade prompt when limit reached
if (!isPremium && watchedTime >= 10) {
  showUpgradeModal();
}
```

#### PDFViewer.jsx
```javascript
const isPremium = user.subscription?.status === 'active';
const PAGE_LIMIT = isPremium ? Infinity : 5;

// Block navigation beyond page 5 for free users
const goToNextPage = () => {
  if (!isPremium && currentPage >= PAGE_LIMIT) {
    showUpgradeModal();
    return;
  }
  setCurrentPage(prev => Math.min(prev + 1, totalPages));
};
```

---

## Stripe Product Setup

### Create Product in Stripe Dashboard

1. **Product Name**: Premium Video & PDF Access
2. **Pricing**: 
   - $9.99/month (or your preferred price)
   - Recurring billing
3. **Features**:
   - Unlimited video playback
   - Full PDF access
   - No time restrictions

### Test Mode Credentials

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

---

## User Flow

### Free User Experience

1. **Upload video** → Can watch 10 seconds
2. **After 10 seconds** → "⭐ Upgrade to Premium for unlimited access"
3. **Upload PDF** → Can view 5 pages
4. **Try to go to page 6** → "🔒 Upgrade to view all pages"

### Upgrade Flow

1. Click "Upgrade to Premium" button
2. Redirect to Stripe Checkout
3. Enter payment details
4. Complete payment
5. Redirect back to app
6. Subscription activated ✅
7. Unlimited access granted

### Subscription Management

1. Click "Manage Subscription" in profile
2. Opens Stripe Customer Portal
3. Can:
   - Update payment method
   - Cancel subscription
   - View invoices
   - Reactivate canceled subscription

---

## Pricing Tiers

| Feature | Free | Premium |
|---------|------|---------|
| Video Time Limit | 10 seconds | ♾️ Unlimited |
| PDF Pages | 5 pages | ♾️ All pages |
| File Encryption | ✅ | ✅ |
| Chunked Streaming | ✅ | ✅ |
| Download Protection | ✅ | ✅ |
| Price | $0/month | $9.99/month |

---

## Security Considerations

1. **Server-Side Validation**: Always check subscription status on server
2. **Webhook Verification**: Validate Stripe webhook signatures
3. **Token Refresh**: Update user subscription in JWT/session
4. **Grace Period**: Allow 3 days past due before revoking access
5. **Cancellation**: Keep access until end of billing period

---

## Testing Checklist

- [ ] Free user sees time/page limits
- [ ] Premium user has unlimited access
- [ ] Stripe checkout works
- [ ] Webhook updates subscription status
- [ ] Customer portal allows cancellation
- [ ] Canceled users lose access at period end
- [ ] Payment failures handled gracefully
- [ ] Upgrade button shows for free users
- [ ] Subscription status displays correctly

---

## Next Steps

Would you like me to implement:
1. ✅ Stripe backend API routes
2. ✅ Updated User model with subscription fields
3. ✅ Frontend pricing modal component
4. ✅ Updated VideoPlayer with premium check
5. ✅ Updated PDFViewer with page limit

Let me know and I'll start building! 🚀
