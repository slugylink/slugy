# Cron Jobs Configuration

This document outlines the scheduled jobs required for the application.

## Required Cron Jobs

### 1. Usage Period Reset (`/api/cron/usage`)
**Purpose**: Resets workspace usage tracking every month

**Schedule**: `0 0 * * *` (Daily at midnight UTC)

**What it does**:
- Checks all workspaces for expired usage periods
- Archives old usage records
- Creates new usage period (1 month) for each workspace
- Resets link and click counters

**QStash Setup**:
```bash
curl -X POST https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer <QSTASH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://yourdomain.com/api/cron/usage",
    "cron": "0 0 * * *",
    "method": "POST"
  }'
```

### 2. Subscription Renewal (`/api/cron/subscription-renewal`)
**Purpose**: Renews free plans and downgrades canceled paid subscriptions

**Schedule**: `0 * * * *` (Hourly - every hour at minute 0)

**Why Hourly?**
- Subscriptions can expire at any time, not just midnight
- Ensures users are downgraded within 1 hour of subscription expiring
- Provides accurate "grace period" behavior
- Example: If subscription ends at 2:30 PM, user is downgraded by 3:00 PM

**What it does**:
- Checks all subscriptions with expired billing periods
- Renews free plan subscriptions with 1-month period
- Downgrades canceled paid subscriptions to free plan when period ends
- Active paid subscriptions are handled automatically by Polar webhooks

**QStash Setup**:
```bash
curl -X POST https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer <QSTASH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://yourdomain.com/api/cron/subscription-renewal",
    "cron": "0 * * * *",
    "method": "POST"
  }'
```

## Billing Period Rules

### Free Plan
- **Billing Cycle**: 1 month (monthly renewal)
- **Renewal**: Automatic via cron job
- **Period Start**: Current date
- **Period End**: Current date + 1 month

### Pro Plan (Monthly)
- **Billing Cycle**: 1 month
- **Renewal**: Handled by Polar webhooks
- **Period Start/End**: Set by Polar subscription

### Pro Plan (Yearly)
- **Billing Cycle**: 1 year
- **Renewal**: Handled by Polar webhooks
- **Period Start/End**: Set by Polar subscription

## Subscription Cancellation Behavior

### When User Cancels (onSubscriptionCanceled)
**Industry Standard Approach - Grace Period:**

1. ✅ Subscription marked as `cancelAtPeriodEnd: true`
2. ✅ Status remains `active` - user keeps Pro access
3. ✅ Pro limits maintained until period ends
4. ✅ User gets full value of paid period
5. ✅ Downgrade happens automatically at period end via cron job

**Example**: User cancels on Jan 15, paid until Jan 31
- Jan 15-31: Keeps Pro features and limits
- Feb 1: Automatically downgraded to Free plan

### When Subscription is Revoked (onSubscriptionRevoked)
**Immediate Downgrade - Payment Failure/Fraud:**

1. ❌ Immediate downgrade to Free plan
2. ❌ Limits reduced immediately
3. ❌ No grace period (payment failed/fraud detected)

This ensures users always get what they paid for, while protecting against fraud.

## Usage Tracking

Usage periods are **separate** from billing periods:

- **Usage Period**: Always 1 month for all plans
- **Purpose**: Track links created, clicks, etc. per month
- **Renewal**: Automatic via usage cron job
- **Reset**: Every month, counters reset to 0

## Environment Variables Required

```env
# QStash (for cron job verification)
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

# Polar (for subscription management)
POLAR_ACCESS_TOKEN=your_polar_token
POLAR_MODE=sandbox|production
POLAR_WEBHOOK_SECRET=your_webhook_secret
```

## Testing Cron Jobs Locally

You can test cron jobs without QStash signature verification by calling them directly:

```bash
# Test usage reset
curl -X POST http://localhost:3000/api/cron/usage

# Test subscription renewal
curl -X POST http://localhost:3000/api/cron/subscription-renewal
```

## Monitoring

Both cron jobs return JSON responses with execution details:

```json
{
  "message": "Cron job completed",
  "processed": 100,
  "reset": 50,
  "timestamp": "2026-01-21T00:00:00.000Z"
}
```

Monitor these endpoints regularly to ensure they're executing successfully.
