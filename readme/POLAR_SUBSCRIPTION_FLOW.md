# Polar Subscription Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INITIATES SUBSCRIPTION                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. USER CLICKS "UPGRADE" BUTTON                                │
│     Location: /app/upgrade or pricing page                      │
│     Action: handleClick(productId)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. REDIRECT TO CHECKOUT                                        │
│     URL: /api/subscription/checkout?productId=xxx              │
│     File: src/app/api/subscription/checkout/route.ts            │
│                                                                  │
│     What happens:                                                │
│     - Authenticates user                                        │
│     - Gets user info from database                              │
│     - Adds customer metadata (userId, email, name)              │
│     - Calls Polar Checkout handler                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. POLAR CHECKOUT PAGE                                         │
│     - User enters payment details                               │
│     - Polar processes payment                                    │
│     - User completes checkout                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. POLAR SENDS WEBHOOK EVENTS                                  │
│     Webhook URL: /api/webhook/polar                             │
│     File: src/app/api/webhook/polar/route.ts                    │
│                                                                  │
│     Events received (in order):                                 │
│     a) order.created        → Links customerId to user            │
│     b) subscription.created → Creates subscription in DB         │
│     c) subscription.active  → Activates subscription              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. WEBHOOK PROCESSING                                          │
│                                                                  │
│     onOrderCreated:                                             │
│     - Extracts userId from metadata                             │
│     - Gets customerId from order                                │
│     - Updates user.customerId in database                       │
│                                                                  │
│     onSubscriptionCreated:                                       │
│     - Extracts userId from metadata                             │
│     - Finds plan by priceId (monthly/yearly)                    │
│     - Creates/updates subscription record                       │
│     - Links subscription to user                                 │
│     - Updates user.customerId                                   │
│                                                                  │
│     onSubscriptionActive:                                       │
│     - Handles missed subscription.created events                 │
│     - Updates subscription status to "active"                   │
│     - Updates period dates                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. USER REDIRECTED TO SUCCESS PAGE                             │
│     URL: POLAR_SUCCESS_URL (from env)                           │
│     Default: https://app.slugy.co/                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION ACTIVE                          │
│     User now has paid subscription in database                  │
└─────────────────────────────────────────────────────────────────┘
```

## Subscription Lifecycle Events

### 1. **Order Created** (`onOrderCreated`)
- **When**: Payment is processed
- **Purpose**: Link Polar customer ID to user account
- **Action**: Updates `user.customerId` in database

### 2. **Subscription Created** (`onSubscriptionCreated`)
- **When**: New subscription is created in Polar
- **Purpose**: Create subscription record in your database
- **Actions**:
  - Finds plan by `priceId` (handles monthly/yearly)
  - Creates/updates subscription with:
    - `subscriptionId` (Polar's ID)
    - `customerId` (Polar's customer ID)
    - `planId` (your plan ID)
    - `status`, `periodStart`, `periodEnd`
    - `billingInterval` (month/year)
  - Updates user's `customerId`

### 3. **Subscription Updated** (`onSubscriptionUpdated`)
- **When**: Subscription details change (billing period, status, etc.)
- **Purpose**: Keep subscription in sync with Polar
- **Special handling**: 
  - If status is "canceled" or "revoked" → Downgrade to free plan
  - Sets free plan period to 20 years (unlimited)

### 4. **Subscription Active** (`onSubscriptionActive`)
- **When**: Subscription becomes active (payment successful, trial started)
- **Purpose**: Activate subscription or handle missed events
- **Fallback**: Creates subscription if `subscription.created` was missed

### 5. **Subscription Canceled** (`onSubscriptionCanceled`)
- **When**: User cancels subscription
- **Purpose**: Downgrade user to free plan
- **Action**: 
  - Sets subscription to free plan
  - Sets period to 20 years (unlimited)
  - Clears `priceId`

### 6. **Subscription Revoked** (`onSubscriptionRevoked`)
- **When**: Payment fails, fraud detected, etc.
- **Purpose**: Downgrade user to free plan
- **Action**: Same as canceled

## Free Subscription Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER SIGNUP                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  USER COMPLETES ONBOARDING                                      │
│  Location: /onboarding/welcome                                  │
│  Component: GetStarted                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CREATE FREE SUBSCRIPTION                                       │
│  Action: createFreeSubscription(userId)                         │
│  File: src/server/actions/onbaording/get-started.ts             │
│                                                                  │
│  What happens:                                                   │
│  - Checks if user already has subscription                       │
│  - Finds free plan in database                                  │
│  - Creates subscription with:                                  │
│    * planId: free plan ID                                       │
│    * status: "active"                                           │
│    * provider: "internal" (not Polar)                          │
│    * periodEnd: 20 years from now (unlimited)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Database Models

### Subscription Table
- `referenceId`: User ID (unique)
- `subscriptionId`: Polar's subscription ID (unique)
- `customerId`: Polar's customer ID
- `planId`: Your plan ID
- `priceId`: Polar's price ID (monthly/yearly)
- `status`: "active", "canceled", "revoked"
- `periodStart` / `periodEnd`: Billing period dates
- `billingInterval`: "month" or "year"
- `provider`: "polar" or "internal"

### Plan Table
- `monthlyPriceId`: Polar price ID for monthly billing
- `yearlyPriceId`: Polar price ID for yearly billing
- `planType`: "free", "pro", etc.

## Important Notes

1. **Metadata is Critical**: The `userId` is passed in metadata during checkout, which webhooks use to link subscriptions to users.

2. **Price ID Matching**: The system matches Polar price IDs to your plans by checking both `monthlyPriceId` and `yearlyPriceId` fields.

3. **Whitespace Handling**: There's fallback logic to trim whitespace when matching price IDs (handles data inconsistencies).

4. **Free Plan Fallback**: When subscriptions are canceled/revoked, users are automatically downgraded to free plan with 20-year period.

5. **Missed Events**: The `onSubscriptionActive` handler can create subscriptions if the `subscription.created` event was missed.

6. **Customer ID Linking**: Both order and subscription events update the user's `customerId` for future reference.

