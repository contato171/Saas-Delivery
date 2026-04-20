import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_chave_falsa_para_vercel', {
  apiVersion: '2026-02-25.clover' as any,
  appInfo: {
    name: 'SaaS Nexus Delivery',
    version: '0.1.0',
  },
});