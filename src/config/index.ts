import dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is missing in environment variables");
}

export default {
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "access",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh",
    // Cast these to any or string to satisfy the jwt.sign overload
    accessExpiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m") as any,
    refreshExpiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") as any,
  },
  verification: {
    expiresIn: (process.env.VERIFY_EXPIRES_IN || "1d") as any,
  },
  reset: {
    expiresIn: (process.env.RESET_EXPIRES_IN || "1h") as any,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
  },
  platform: {
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "10"),
  }
};
