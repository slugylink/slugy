# Subscription System Documentation

This document provides a complete overview of the subscription system implementation.

## System Overview

The subscription system integrates with Polar for payment processing and implements proper subscription lifecycle management with grace periods, automatic renewals, and limit syncing.

## Key Features

### ✅ Production-Ready Features

1. **Grace Period on Cancellation**
   - Users keep Pro access until billing period ends
   - Industry-standard behavior
   - Users get full value of what they paid for

2. **Automatic Limit Syncing**
   - Workspace limits updated on subscription change
   - Bio gallery limits updated on subscription change
   - Immediate sync on upgrade, delayed on cancellation

3. **Monthly Billing Cycles**
   - Free plan: 1 month periods
   - Pro Monthly: 1 month periods (via Polar)
   - Pro Yearly: 1 year periods (via Polar)

4. **Usage Tracking**
   - Separate from billing cycles
   - Always resets monthly for all plans
   - Tracks links, clicks, users per workspace

5. **Cache Revalidation**
   - Automatic cache invalidation on subscription changes
   - Ensures UI reflects changes immediately

6. **Customer Management**
   - Customer deleted from Polar when user deletes account
   - Graceful error handling if customer doesn't exist

## Architecture

### Database Schema

```prisma
model Subscription {
  id                String   @id @default(cuid())
  planId            String
  referenceId       String   @unique // userId
  customerId        String?
  subscriptionId    String?  @unique
  status            String   @default("active")
  periodStart       DateTime @default(now())
  periodEnd         DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  canceledAt        DateTime?
  billingInterval   Interval @default(month)
  // ... other fields
}
```

### Key Components

#### 1. Webhook Handlers (`/api/webhook/polar/route.ts`)

**onOrderCreated**
- Links customer ID to user account

**onSubscriptionCreated**
- Creates subscription record
- Syncs workspace/bio limits
- Revalidates cache

**onSubscriptionUpdated**
- Updates subscription details
- Handles plan changes (upgrade/downgrade)
- Updates period dates
- Syncs limits if plan changed

**onSubscriptionActive**
- Activates subscription
- Creates if missing (missed webhook)
- Updates period dates

**onSubscriptionCanceled** ⭐
- Marks subscription for cancellation
- Keeps status "active"
- Sets `cancelAtPeriodEnd: true`
- User retains Pro access until period ends

**onSubscriptionRevoked**
- Immediate downgrade to free
- For payment failures/fraud
- No grace period

#### 2. Subscription Renewal Cron (`/api/cron/subscription-renewal/route.ts`)

**Runs**: Hourly (every hour at minute 0)

**Why Hourly?**
- Subscriptions expire at different times throughout the day
- Ensures accurate grace period end times
- Users are downgraded within 1 hour of expiration
- Example: Subscription ends at 2:30 PM → Downgraded by 3:00 PM

**Handles**:
- Free plan renewals (1 month periods)
- Canceled subscription downgrades (when period ends)
- Limit syncing on downgrade

**Process**:
```
1. Query subscriptions with expired periods
2. Check if cancelAtPeriodEnd === true
3. If yes: Downgrade to free, sync limits
4. If no (free plan): Renew for 1 month
5. Revalidate cache
```

#### 3. Usage Tracking Cron (`/api/cron/usage/route.ts`)

**Runs**: Daily at 12:00 AM UTC

**Handles**:
- Monthly usage period resets
- Workspace usage tracking
- Independent of billing cycles

#### 4. Limits Sync (`/lib/subscription/limits-sync.ts`)

**syncUserLimits(userId, planType)**
- Updates all workspaces for user
- Updates all bio galleries for user
- Applies plan-specific limits

**revalidateSubscriptionCache()**
- Invalidates subscription cache
- Invalidates workspace cache
- Invalidates bio cache

### API Endpoints

#### Checkout (`/api/subscription/checkout`)
- Redirects to Polar checkout
- Uses `customerExternalId` instead of `customerId`
- Avoids "customer does not exist" errors

#### Manage (`/api/subscription/manage`)
- Redirects to Polar customer portal
- User can cancel, update payment, view invoices

## User Flows

### 1. New User Signup

```
1. User signs up
2. Free subscription created automatically (see seed/setup)
3. Default limits applied
4. 1-month billing period set
```

### 2. Upgrade to Pro

```
1. User clicks "Upgrade"
2. Redirects to /api/subscription/checkout
3. Polar creates checkout session
4. User completes payment
5. Webhook: onSubscriptionCreated fires
6. Subscription created in DB
7. syncUserLimits() upgrades all workspaces/bios
8. Cache revalidated
9. User immediately gets Pro features
```

### 3. Subscription Renewal (Paid)

```
1. Polar automatically charges user
2. Webhook: onSubscriptionUpdated fires
3. Period dates updated in DB
4. Cache revalidated
5. User continues with Pro access
```

### 4. User Cancels Subscription ⭐

```
1. User clicks "Manage Subscription"
2. Opens Polar portal
3. User cancels subscription
4. Webhook: onSubscriptionCanceled fires
5. DB: cancelAtPeriodEnd = true
6. DB: status = "active" (NOT canceled)
7. User sees "Canceling" notice on billing page
8. User KEEPS Pro access and limits
9. [Period ends]
10. Cron job runs: subscription-renewal
11. Detects cancelAtPeriodEnd = true
12. Downgrades to free plan
13. syncUserLimits() applies free limits
14. User now has free plan
```

### 5. Payment Failure (Revoked)

```
1. Payment fails or fraud detected
2. Webhook: onSubscriptionRevoked fires
3. IMMEDIATE downgrade to free
4. syncUserLimits() applies free limits
5. User loses Pro access immediately
```

### 6. Account Deletion

```
1. User deletes account
2. Fetch customerId from DB
3. Call polarClient.customers.delete()
4. Delete user from DB (cascade deletes subscription)
5. Cache invalidated
```

## Configuration

### Environment Variables

```env
# Polar Configuration
POLAR_ACCESS_TOKEN=polar_oat_xxxxx
POLAR_MODE=sandbox|production
POLAR_WEBHOOK_SECRET=whsec_xxxxx
POLAR_SUCCESS_URL=https://app.slugy.co/
NEXT_PUBLIC_APP_URL=https://app.slugy.co

# QStash (for cron jobs)
QSTASH_CURRENT_SIGNING_KEY=xxxxx
QSTASH_NEXT_SIGNING_KEY=xxxxx

# Database
DATABASE_URL=postgresql://...
```

### Cron Job Schedule

```json
{
  "crons": [
    {
      "path": "/api/cron/usage",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/subscription-renewal",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule Explanation:**
- Usage Reset: `0 0 * * *` = Daily at midnight (usage always resets at start of day)
- Subscription Renewal: `0 * * * *` = Every hour (subscriptions expire at different times)

## Testing

### Test Cancellation Flow

1. Create test Pro subscription
2. Cancel via Polar portal
3. Check DB: `cancelAtPeriodEnd` should be `true`
4. Check DB: `status` should be `"active"`
5. Check UI: Should show "Canceling" notice
6. Manually trigger cron or wait for period end
7. Check DB: Should be downgraded to free
8. Check workspace limits: Should be free tier limits

### Test Upgrade Flow

1. Start with free plan
2. Click upgrade, complete checkout
3. Check webhook logs for `onSubscriptionCreated`
4. Check DB: Subscription should exist with Pro plan
5. Check workspace limits: Should be Pro tier limits
6. Check UI: Should show Pro plan

### Test Renewal Flow (Free)

1. Set subscription `periodEnd` to past date
2. Manually trigger `/api/cron/subscription-renewal`
3. Check DB: `periodEnd` should be updated (+1 month)
4. Check response: Should show renewed count

## Monitoring

### Key Metrics to Track

1. **Subscription Changes**
   - Upgrades per day
   - Cancellations per day
   - Downgrades per day

2. **Cron Job Success**
   - Usage reset completion rate
   - Subscription renewal completion rate
   - Error rates

3. **Webhook Delivery**
   - Polar webhook success rate
   - Webhook processing time
   - Failed webhooks

### Logs to Monitor

```bash
# Subscription changes
grep "\[Polar\]" logs
grep "\[Limits Sync\]" logs

# Cron jobs
grep "\[Subscription Renewal\]" logs
grep "\[Usage Reset\]" logs

# Errors
grep "error" logs | grep -i subscription
```

## Common Issues & Solutions

### Issue: "Customer does not exist"
**Solution**: Checkout route now uses `customerExternalId` instead of `customerId`

### Issue: User loses access immediately after cancellation
**Solution**: Implemented grace period - user keeps access until period ends

### Issue: Billing cycle shows wrong dates
**Solution**: Fixed to use subscription period, not usage period

### Issue: Limits don't update on subscription change
**Solution**: Added `syncUserLimits()` calls in all relevant webhooks

### Issue: Free plan shows 20-year period
**Solution**: Changed to 1-month periods for all plans

## Security Considerations

1. **Webhook Signature Verification**
   - All Polar webhooks verify signature
   - Prevents unauthorized subscription changes

2. **Authentication**
   - All API routes check user session
   - Customer ID validated against logged-in user

3. **Authorization**
   - Users can only manage their own subscriptions
   - Customer portal access restricted to subscription owner

## Future Improvements

### Potential Enhancements

1. **Subscription History**
   - Track all subscription changes
   - Show history in billing page

2. **Email Notifications**
   - Email when subscription canceled
   - Email before period ends
   - Email when downgraded

3. **Usage Warnings**
   - Warn when approaching limits
   - Suggest upgrade when limits hit

4. **Analytics**
   - Track subscription metrics
   - MRR calculation
   - Churn rate

5. **Proration**
   - Handle mid-cycle upgrades/downgrades
   - Calculate prorated amounts

## Support & Troubleshooting

### For Users

**"My subscription is canceling, can I reactivate?"**
- Yes, upgrade again before period ends
- Will create new subscription with new period

**"I canceled but still have Pro access"**
- This is expected! You keep access until period ends
- Check billing page for exact end date

**"When will I be charged again?"**
- Check billing page for next billing date
- Paid subscriptions managed by Polar

### For Developers

**Check subscription status:**
```sql
SELECT * FROM subscriptions WHERE "referenceId" = 'user-id';
```

**Manually trigger downgrade:**
```bash
curl -X POST http://localhost:3000/api/cron/subscription-renewal
```

**Check user limits:**
```sql
SELECT "maxLinksLimit", "maxClicksLimit", "maxUsers" 
FROM workspaces 
WHERE "userId" = 'user-id';
```

## Conclusion

This subscription system provides a production-ready, user-friendly implementation with proper grace periods, automatic renewals, and comprehensive error handling. Users always get what they paid for, and limits are properly synced across the entire application.
