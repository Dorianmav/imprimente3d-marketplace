import type { User } from '~/types';

export function useStripeService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  /**
   * Create a Stripe seller account
   */
  async function createSellerAccount(token: string | null): Promise<{ url: string }> {
    return $fetch(`${apiBase}/stripe/seller/account`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Get Stripe onboarding URL for seller
   */
  async function getOnboardingUrl(token: string | null): Promise<{ url: string }> {
    return $fetch(`${apiBase}/stripe/seller/onboarding`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Check if seller onboarding is complete
   */
  async function checkOnboarding(token: string | null): Promise<{ onboardingComplete: boolean }> {
    return $fetch(`${apiBase}/stripe/seller/onboarding/check`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Create a payment intent for an order
   */
  async function createPaymentIntent(
    token: string | null,
    commandeId: string
  ): Promise<{ clientSecret: string }> {
    return $fetch(`${apiBase}/stripe/payment-intent/${commandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Create a refund for an order (admin)
   */
  async function createRefund(
    token: string | null,
    commandeId: string,
    montant?: number
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/stripe/refund/${commandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      body: { montant },
    });
  }

  /**
   * Retry a failed transfer (admin)
   */
  async function retryTransfer(
    token: string | null,
    commandeId: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/stripe/transfer/retry/${commandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Full refund (no amount param) - admin
   */
  async function createRefundFull(
    token: string | null,
    commandeId: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/stripe/refund/full/${commandeId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    createSellerAccount,
    getOnboardingUrl,
    checkOnboarding,
    createPaymentIntent,
    createRefund,
    createRefundFull,
    retryTransfer,
  };
}
