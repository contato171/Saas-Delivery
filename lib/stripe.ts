import Stripe from 'stripe';

// O "|| 'sk_test_dummy'" é a nossa blindagem. Impede a Stripe de travar a Vercel.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_para_vercel', {
  apiVersion: '2023-10-16' as any,
  appInfo: {
    name: 'SaaS Delivery IA',
    version: '0.1.0',
  },
});