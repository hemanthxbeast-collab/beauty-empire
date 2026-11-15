-- Database-level guarantees that complement the application logic.

-- 1. Prevent double booking: no two active (PENDING / CONFIRMED) appointments for the
--    same staff member may overlap in time. Enforced atomically by PostgreSQL, so it
--    holds even under concurrent requests from multiple app instances.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_no_staff_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));

-- 2. Sanity checks
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_time_order" CHECK ("endAt" > "startAt");
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_amounts_non_negative"
  CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "total" >= 0);
ALTER TABLE "service" ADD CONSTRAINT "service_price_non_negative" CHECK ("price" >= 0 AND ("discountPrice" IS NULL OR "discountPrice" >= 0));
ALTER TABLE "service" ADD CONSTRAINT "service_duration_positive" CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 720);
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "offer" ADD CONSTRAINT "offer_discount_range" CHECK ("discountPercent" BETWEEN 0 AND 100);
ALTER TABLE "offer" ADD CONSTRAINT "offer_valid_range" CHECK ("validUntil" >= "validFrom");
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_range"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");
ALTER TABLE "staff_leave" ADD CONSTRAINT "staff_leave_range" CHECK ("endDate" >= "startDate");
ALTER TABLE "salon_settings" ADD CONSTRAINT "salon_settings_singleton" CHECK ("id" = 1);
