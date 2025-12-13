import { Webhooks } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

// Validate webhook secret
const validateWebhookSecret = (secret: string | undefined) => {
  if (!secret) return { valid: false, error: "POLAR_WEBHOOK_SECRET is not set" };
  if (secret.length < 20) return { valid: false, error: "POLAR_WEBHOOK_SECRET appears to be invalid" };
  return { valid: true };
};

const secretValidation = validateWebhookSecret(process.env.POLAR_WEBHOOK_SECRET);

// Helper function to find or create a plan based on Polar product/price
async function findOrCreatePlan(
  productId: string,
  priceId: string,
  interval: "month" | "year"
) {
  // Try to find existing plan by price ID
  let plan = await db.plan.findFirst({
    where: {
      OR: [
        { monthlyPriceId: interval === "month" ? priceId : undefined },
        { yearlyPriceId: interval === "year" ? priceId : undefined },
      ],
    },
  });

  // If plan doesn't exist, create a basic plan
  // Note: In production, you should sync plans from Polar or configure them manually
  if (!plan) {
    plan = await db.plan.create({
      data: {
        name: "Pro Plan",
        planType: "pro",
        currency: "USD",
        interval: interval === "month" ? "month" : "year",
        monthlyPrice: 0, // Will be updated from webhook data
        monthlyPriceId: interval === "month" ? priceId : undefined,
        yearlyPrice: 0, // Will be updated from webhook data
        yearlyPriceId: interval === "year" ? priceId : undefined,
        // Set default limits
        maxWorkspaces: 8,
        maxLinksPerWorkspace: 100,
        maxClicksPerWorkspace: 20000,
        maxGalleries: 20,
        maxLinksPerBio: 20,
        maxUsers: 3,
        maxCustomDomains: 10,
        maxTagsPerWorkspace: 20,
      },
    });
  }

  return plan;
}

// Type definitions for webhook payloads
interface SubscriptionPayload {
  data: {
    id: string;
    customer_id: string;
    product_id: string;
    price_id: string;
    status: string;
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
  };
}

interface CustomerPayload {
  data: {
    id: string;
    email?: string;
  };
}

interface CheckoutPayload {
  type: string;
  data: {
    id: string;
    customer_id?: string | null;
    customer_email?: string | null;
    customer?: {
      id?: string;
      email?: string;
    } | null;
    product_id?: string | null;
    price_id?: string | null;
    product?: {
      id?: string;
    } | null;
    price?: {
      id?: string;
    } | null;
    status?: string;
    [key: string]: unknown; // Allow other fields
  };
}

// Handle subscription created event
async function handleSubscriptionCreated(payload: SubscriptionPayload) {
  try {
    const subscription = payload.data;
    const customerId = subscription.customer_id;
    const productId = subscription.product_id;
    const priceId = subscription.price_id;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    // Find user by customer ID
    const user = await db.user.findFirst({
      where: { customerId },
    });

    if (!user) {
      console.error(`User not found for customer ID: ${customerId}`);
      return;
    }

    // Determine interval from price ID or default to month
    // In a real implementation, you might want to fetch this from Polar
    const interval: "month" | "year" = "month"; // Default, should be determined from price

    // Find or create plan
    const plan = await findOrCreatePlan(productId, priceId, interval);

    if (!plan) {
      console.error(`Failed to find or create plan for product: ${productId}`);
      return;
    }

    // Calculate period dates
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : new Date();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days

    // Create or update subscription
    await db.subscription.upsert({
      where: { referenceId: user.id },
      create: {
        planId: plan.id,
        priceId,
        referenceId: user.id,
        customerId,
        subscriptionId,
        status: status || "active",
        periodStart,
        periodEnd,
        billingInterval: interval,
        cancelAtPeriodEnd: false,
      },
      update: {
        planId: plan.id,
        priceId,
        customerId,
        subscriptionId,
        status: status || "active",
        periodStart,
        periodEnd,
        billingInterval: interval,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    console.log(`Subscription created/updated for user: ${user.id}`);
  } catch (error) {
    console.error("Error handling subscription.created:", error);
    throw error;
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(payload: SubscriptionPayload) {
  try {
    const subscription = payload.data;
    const customerId = subscription.customer_id;
    const status = subscription.status;

    // Find user by customer ID
    const user = await db.user.findFirst({
      where: { customerId },
    });

    if (!user) {
      console.error(`User not found for customer ID: ${customerId}`);
      return;
    }

    // Find existing subscription
    const existingSubscription = await db.subscription.findUnique({
      where: { referenceId: user.id },
    });

    if (!existingSubscription) {
      console.error(`Subscription not found for user: ${user.id}`);
      return;
    }

    // Update subscription
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : existingSubscription.periodStart;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : existingSubscription.periodEnd;

    await db.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: status || existingSubscription.status,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: status === "canceled" ? new Date() : null,
      },
    });

    console.log(`Subscription updated for user: ${user.id}`);
  } catch (error) {
    console.error("Error handling subscription.updated:", error);
    throw error;
  }
}

// Handle subscription canceled event
async function handleSubscriptionCanceled(payload: SubscriptionPayload) {
  try {
    const subscription = payload.data;
    const customerId = subscription.customer_id;

    // Find user by customer ID
    const user = await db.user.findFirst({
      where: { customerId },
    });

    if (!user) {
      console.error(`User not found for customer ID: ${customerId}`);
      return;
    }

    // Update subscription status
    await db.subscription.updateMany({
      where: { referenceId: user.id },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    console.log(`Subscription canceled for user: ${user.id}`);
  } catch (error) {
    console.error("Error handling subscription.canceled:", error);
    throw error;
  }
}

// Handle customer created event
async function handleCustomerCreated(payload: CustomerPayload) {
  try {
    const customer = payload.data;
    const customerId = customer.id;
    const email = customer.email;

    if (!email) {
      console.error("Customer email not found");
      return;
    }

    // Find user by email and update customer ID
    await db.user.updateMany({
      where: { email },
      data: { customerId },
    });

    console.log(`Customer ID updated for user with email: ${email}`);
  } catch (error) {
    console.error("Error handling customer.created:", error);
    throw error;
  }
}

// Handle checkout created event
async function handleCheckoutCreated(payload: CheckoutPayload) {
  try {
    // Log full payload for debugging
    console.log("Checkout payload structure:", JSON.stringify(payload, null, 2));

    const checkout = payload.data;
    if (!checkout) {
      console.error("Checkout data is missing in payload");
      return;
    }

    // Extract customer info - check both direct fields and nested customer object
    const customerId = checkout.customer_id || checkout.customer?.id || null;
    const customerEmail = checkout.customer_email || checkout.customer?.email || null;

    // Extract product/price info - check both direct fields and nested objects
    const productId = checkout.product_id || checkout.product?.id || null;
    const priceId = checkout.price_id || checkout.price?.id || null;

    // If checkout has customer info, link it to user account
    if (customerId && customerEmail) {
      // Find user by email and update customer ID
      const updateResult = await db.user.updateMany({
        where: { email: customerEmail },
        data: { customerId },
      });

      if (updateResult.count > 0) {
        console.log(`Customer ID linked from checkout for user with email: ${customerEmail}`);
      } else {
        console.log(`No user found with email: ${customerEmail} to link customer ID`);
      }
    } else if (customerId) {
      // If we have customer ID but no email, log it for manual linking
      console.log(`Checkout has customer ID but no email: ${customerId}`);
    }

    // Log checkout creation for tracking
    console.log(`Checkout created: ${checkout.id}`, {
      customerId: customerId || undefined,
      customerEmail: customerEmail || undefined,
      productId: productId || undefined,
      priceId: priceId || undefined,
      status: checkout.status || "unknown",
    });
  } catch (error) {
    console.error("Error handling checkout.created:", error);
    // Don't throw - checkout.created is informational, not critical
  }
}

export const POST = secretValidation.valid
  ? Webhooks({
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
      onPayload: async (payload) => {
        try {
          const eventType = payload.type;

          console.log(`Received webhook event: ${eventType}`);

          switch (eventType) {
            case "subscription.created":
              await handleSubscriptionCreated(payload as unknown as SubscriptionPayload);
              break;
            case "subscription.updated":
              await handleSubscriptionUpdated(payload as unknown as SubscriptionPayload);
              break;
            case "subscription.canceled":
              await handleSubscriptionCanceled(payload as unknown as SubscriptionPayload);
              break;
            case "customer.created":
              await handleCustomerCreated(payload as unknown as CustomerPayload);
              break;
            case "checkout.created":
              await handleCheckoutCreated(payload as unknown as CheckoutPayload);
              break;
            default:
              console.log(`Unhandled webhook event type: ${eventType}`);
          }
        } catch (error) {
          console.error("Error processing webhook payload:", error);
          throw error;
        }
      },
    })
  : async () => {
      return NextResponse.json(
        { error: "Webhook service is not configured properly" },
        { status: 503 }
      );
    };
