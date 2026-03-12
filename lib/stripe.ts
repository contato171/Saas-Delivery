import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_chave_falsa_para_vercel', {
  apiVersion: '2023-10-16' as any,
  appInfo: {
    name: 'SaaS Delivery IA',
    version: '0.1.0',
  },
});