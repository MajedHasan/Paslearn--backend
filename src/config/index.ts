import dotenv from "dotenv";
dotenv.config();

export default {
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/awesome_dev",
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
};
