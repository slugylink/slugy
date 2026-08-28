-- Track verified lifetime Basic purchases so Pro downgrades can restore access.
ALTER TABLE "user" ADD COLUMN "lifetimeBasicAt" TIMESTAMP(3);
