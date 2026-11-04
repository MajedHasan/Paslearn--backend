// src/modules/platform-settings/settings.service.ts
import PlatformSettingsModel from "./settings.model";
import { IPlatformSettings } from "./settings.interface";

const SINGLETON_KEY = "platform";

const SECTION_KEYS = [
  "general", "commerce", "subscriptions", "addons", "ai", "storage",
  "security", "email", "features", "affiliate", "legal",
] as const;

type SectionKey = typeof SECTION_KEYS[number];

export const platformSettingsService = {
  async get(): Promise<IPlatformSettings> {
    let doc = await PlatformSettingsModel.findOne({ key: SINGLETON_KEY });
    if (!doc) doc = await PlatformSettingsModel.create({ key: SINGLETON_KEY });
    return doc;
  },

  async update(payload: Partial<Record<SectionKey, any>>, adminId?: string): Promise<IPlatformSettings> {
    const doc: any = await this.get();

    // ── Validation ─────────────────────────────────
    const commerce = payload.commerce || {};
    if (commerce.platformFeePercent !== undefined) {
      const n = Number(commerce.platformFeePercent);
      if (isNaN(n) || n < 0 || n > 50) throw new Error("Platform fee must be between 0 and 50");
    }
    if (commerce.minPayoutAmount !== undefined) {
      const n = Number(commerce.minPayoutAmount);
      if (isNaN(n) || n < 0) throw new Error("Minimum payout must be >= 0");
    }
    if (commerce.taxPercent !== undefined) {
      const n = Number(commerce.taxPercent);
      if (isNaN(n) || n < 0 || n > 100) throw new Error("Tax percent must be 0–100");
    }

    const subs = payload.subscriptions || {};
    if (subs.freeTrialDays !== undefined && Number(subs.freeTrialDays) < 0) {
      throw new Error("Trial days must be >= 0");
    }
    if (subs.gracePeriodDays !== undefined && Number(subs.gracePeriodDays) < 0) {
      throw new Error("Grace period must be >= 0");
    }

    const ai = payload.ai || {};
    if (ai.maxRequestsPerMinute !== undefined && Number(ai.maxRequestsPerMinute) < 1) {
      throw new Error("Max requests per minute must be >= 1");
    }
    if (ai.creditsPerPlan) {
      for (const k of ["free_trial", "starter", "pro", "business"] as const) {
        const v = ai.creditsPerPlan[k];
        if (v !== undefined && Number(v) < 0) {
          throw new Error(`AI credits for ${k} must be >= 0`);
        }
      }
    }

    const storage = payload.storage || {};
    if (storage.maxUploadMB !== undefined && Number(storage.maxUploadMB) < 1) {
      throw new Error("Max upload MB must be >= 1");
    }
    if (storage.maxVideoUploadMB !== undefined && Number(storage.maxVideoUploadMB) < 1) {
      throw new Error("Max video upload MB must be >= 1");
    }

    const sec = payload.security || {};
    if (sec.maxLoginAttempts !== undefined && Number(sec.maxLoginAttempts) < 1) {
      throw new Error("Max login attempts must be >= 1");
    }
    if (sec.sessionDurationHours !== undefined && Number(sec.sessionDurationHours) < 1) {
      throw new Error("Session duration must be >= 1 hour");
    }
    if (sec.minPasswordLength !== undefined && Number(sec.minPasswordLength) < 6) {
      throw new Error("Password length must be >= 6");
    }

    // ── Apply ────────────────────────────────────────
    for (const section of SECTION_KEYS) {
      if (payload[section]) {
        const current = doc[section]?.toObject ? doc[section].toObject() : { ...(doc[section] || {}) };
        const merged = { ...current };
        for (const [k, v] of Object.entries(payload[section])) {
          if (v && typeof v === "object" && !Array.isArray(v)) {
            merged[k] = { ...(current[k] || {}), ...(v as any) };
          } else {
            merged[k] = v;
          }
        }
        doc[section] = merged;
      }
    }

    if (adminId) doc.updatedBy = adminId;
    await doc.save();
    return doc;
  },

  async getPublicView() {
    const doc: any = await this.get();
    return {
      siteName: doc.general.siteName,
      siteTagline: doc.general.siteTagline,
      logoUrl: doc.general.logoUrl,
      faviconUrl: doc.general.faviconUrl,
      maintenanceMode: doc.general.maintenanceMode,
      maintenanceMessage: doc.general.maintenanceMessage,
      defaultCurrency: doc.commerce.defaultCurrency,
      features: doc.features,
      legal: {
        termsUrl: doc.legal.termsUrl,
        privacyUrl: doc.legal.privacyUrl,
        refundPolicyUrl: doc.legal.refundPolicyUrl,
        cookiePolicyUrl: doc.legal.cookiePolicyUrl,
        dmcaUrl: doc.legal.dmcaUrl,
        minimumAge: doc.legal.minimumAge,
      },
    };
  },

  /**
   * Integration health — reports which providers are configured
   * without exposing secret values. Safe to call from admin panel.
   */
    /**
   * Integration health — tests actual connections where possible.
   * Reports env var presence for all, connection status for Stripe/PayPal.
   */
  async getIntegrationHealth() {
    const env = process.env;
    const has = (k: string) => !!env[k] && String(env[k]).trim() !== "";

    // ⭐ Real Stripe connection test
    const testStripe = async (): Promise<{
      secretKeySet: boolean;
      webhookSecretSet: boolean;
      publishableKeySet: boolean;
      connected: boolean;
      error?: string;
    }> => {
      const secretKeySet = has("STRIPE_SECRET_KEY");
      const webhookSecretSet = has("STRIPE_WEBHOOK_SECRET");
      const publishableKeySet = has("STRIPE_PUBLISHABLE_KEY") || has("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

      if (!secretKeySet) {
        return { secretKeySet: false, webhookSecretSet, publishableKeySet, connected: false, error: "STRIPE_SECRET_KEY not set" };
      }

      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
        await stripe.balance.retrieve();
        return { secretKeySet, webhookSecretSet, publishableKeySet, connected: true };
      } catch (err: any) {
        return { secretKeySet, webhookSecretSet, publishableKeySet, connected: false, error: err?.message || "Connection failed" };
      }
    };

    // ⭐ Real PayPal OAuth test
    const testPayPal = async (): Promise<{
      clientIdSet: boolean;
      clientSecretSet: boolean;
      webhookIdSet: boolean;
      connected: boolean;
      mode: "live" | "sandbox";
      error?: string;
    }> => {
      const clientIdSet = has("PAYPAL_CLIENT_ID");
      const clientSecretSet = has("PAYPAL_CLIENT_SECRET");
      const webhookIdSet = has("PAYPAL_WEBHOOK_ID");
      const mode = env.PAYPAL_ENV === "live" ? "live" : "sandbox";

      if (!clientIdSet || !clientSecretSet) {
        return { clientIdSet, clientSecretSet, webhookIdSet, connected: false, mode, error: "Missing credentials" };
      }

      try {
        const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
        const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
        const axios = (await import("axios")).default;
        const res = await axios.post(
          `${base}/v1/oauth2/token`,
          "grant_type=client_credentials",
          {
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 5000,
          }
        );
        return { clientIdSet, clientSecretSet, webhookIdSet, connected: res.data?.access_token ? true : false, mode };
      } catch (err: any) {
        return { clientIdSet, clientSecretSet, webhookIdSet, connected: false, mode, error: err?.response?.data?.error_description || err?.message || "OAuth failed" };
      }
    };

    const [stripe, paypal] = await Promise.all([testStripe(), testPayPal()]);

    return {
      stripe,
      paypal,
      smtp: {
        configured: has("SMTP_HOST") && has("SMTP_USER") && has("SMTP_PASS"),
        host: env.SMTP_HOST ? `${env.SMTP_HOST}:${env.SMTP_PORT || 587}` : undefined,
      },
      cloudflareR2: {
        configured: has("R2_ACCOUNT_ID") && has("R2_ACCESS_KEY_ID") && has("R2_SECRET_ACCESS_KEY") && has("R2_BUCKET"),
      },
      mux: { configured: has("MUX_TOKEN_ID") && has("MUX_TOKEN_SECRET") },
      bunny: { configured: has("BUNNY_API_KEY") && has("BUNNY_STORAGE_ZONE") },
      ai: {
        openai: has("OPENAI_API_KEY"),
        anthropic: has("ANTHROPIC_API_KEY"),
        activeProvider: (await this.get()).ai?.provider || "stub",
      },
      frontend: { url: env.FRONTEND_URL || "(not set)" },
    };
  },

  // ── Fast getters for other services ───────────────
  async getPlatformFeePercent(): Promise<number> {
    try {
      const doc: any = await this.get();
      const n = Number(doc.commerce?.platformFeePercent);
      return !isNaN(n) ? n : 10;
    } catch { return 10; }
  },
  async getMinPayoutAmount(): Promise<number> {
    try {
      const doc: any = await this.get();
      const n = Number(doc.commerce?.minPayoutAmount);
      return !isNaN(n) ? n : 50;
    } catch { return 50; }
  },
  async getAffiliateHoldDays(): Promise<number> {
    try {
      const doc: any = await this.get();
      const n = Number(doc.affiliate?.holdDays);
      return !isNaN(n) ? n : 7;
    } catch { return 7; }
  },
  async getAICreditsForPlan(plan: "free_trial" | "starter" | "pro" | "business"): Promise<number> {
    try {
      const doc: any = await this.get();
      return Number(doc.ai?.creditsPerPlan?.[plan] ?? 0);
    } catch { return 0; }
  },
  async getFreeTrialDays(): Promise<number> {
    try {
      const doc: any = await this.get();
      return Number(doc.subscriptions?.freeTrialDays ?? 14);
    } catch { return 14; }
  },
  async getSessionDurationHours(): Promise<number> {
    try {
      const doc: any = await this.get();
      return Number(doc.security?.sessionDurationHours ?? 24);
    } catch { return 24; }
  },
  async getMaxUploadMB(): Promise<number> {
    try {
      const doc: any = await this.get();
      return Number(doc.storage?.maxUploadMB ?? 25);
    } catch { return 25; }
  },
};