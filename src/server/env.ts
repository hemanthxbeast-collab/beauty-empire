import "server-only";

/** Centralised, typed access to server-only configuration. Never import from client components. */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  salonTimezone: process.env.SALON_TIMEZONE || "Asia/Kolkata",
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM ?? "Beauty Empire <bookings@beautyempire.test>",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? "beauty-empire",
  },
  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  cronSecret: process.env.CRON_SECRET,
};

export const integrations = {
  email: Boolean(env.resend.apiKey),
  razorpay: Boolean(env.razorpay.keyId && env.razorpay.keySecret),
  cloudinary: Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret),
  upstash: Boolean(env.upstash.url && env.upstash.token),
};
