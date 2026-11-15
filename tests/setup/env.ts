/**
 * Test environment. Integration tests run against a SEPARATE database (never the dev database).
 * Override with TEST_DATABASE_URL; the default matches docker-compose.yml.
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://beauty:beauty_dev_pw@localhost:5433/beauty_empire_test?schema=public";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-0123456789";
process.env.SALON_TIMEZONE = "Asia/Kolkata";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
// Never call real providers from tests.
delete process.env.RESEND_API_KEY;
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_secret";
