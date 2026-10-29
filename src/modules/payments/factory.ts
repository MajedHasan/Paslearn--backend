import { PaymentProvider } from "./provider.interface";
import { StripeProvider } from "./stripe.provider";
import { PayPalProvider } from "./paypal.provider";
import { AppError } from "../../utils/appError";

const providers = new Map<string, PaymentProvider>([
  ["stripe", new StripeProvider()],
  ["paypal", new PayPalProvider()],
]);

export const paymentProviders = {
  get(name: string): PaymentProvider {
    const adapter = providers.get(name);
    if (!adapter) throw new AppError(`Unknown payment provider: ${name}`, 400);
    return adapter;
  },
};