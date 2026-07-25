import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { STRIPE_CLIENT } from './providers/stripe.provider';

type TypeCompte = 'particulier' | 'pro';

@Injectable()
export class StripeService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createConnectedAccount(
    userId: string,
    email: string,
    nom: string,
    prenom: string,
    typeCompte: TypeCompte,
  ) {
    const isIndividual = typeCompte === 'particulier';

    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      business_type: isIndividual ? 'individual' : 'company',
      business_profile: {
        product_description: isIndividual
          ? "Vente d'objets imprimés en 3D entre particuliers"
          : "Vente d'objets imprimés en 3D (professionnel)",
        mcc: '5945',
      },
      capabilities: {
        transfers: { requested: true },
        ...(isIndividual ? {} : { card_payments: { requested: true } }),
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
      ...(isIndividual
        ? {
            individual: {
              first_name: prenom,
              last_name: nom,
              email,
            },
          }
        : {}),
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: account.id },
    });

    return account;
  }

  async createOnboardingLink(stripeAccountId: string) {
    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${this.config.get('FRONTEND_URL')}/dashboard/stripe/refresh`,
      return_url: `${this.config.get('FRONTEND_URL')}/dashboard/stripe/return`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  async createExpressDashboardLink(stripeAccountId: string) {
    const loginLink =
      await this.stripe.accounts.createLoginLink(stripeAccountId);
    return loginLink.url;
  }

  async getWalletBalance(stripeAccountId: string) {
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const available =
      balance.available.find((b) => b.currency === 'eur')?.amount || 0;
    const pending =
      balance.pending.find((b) => b.currency === 'eur')?.amount || 0;

    return {
      available: available / 100, // Conversion en Euros
      pending: pending / 100,
    };
  }

  async requestPayout(stripeAccountId: string, amountInEuros: number) {
    const amountInCents = Math.round(amountInEuros * 100);

    const { available } = await this.getWalletBalance(stripeAccountId);
    if (available < amountInEuros) {
      throw new BadRequestException('Solde disponible insuffisant.');
    }

    const payout = await this.stripe.payouts.create(
      {
        amount: amountInCents,
        currency: 'eur',
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    return {
      success: true,
      payoutId: payout.id,
      arrivalDate: new Date(payout.arrival_date * 1000),
    };
  }

  async createPaymentIntent(amountInEuros: number, orderId: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amountInEuros * 100),
      currency: 'eur',
      metadata: {
        orderId,
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  async releaseFundsToSeller(
    sellerStripeAccountId: string,
    amountInEuros: number,
    platformFeeInEuros: number,
  ) {
    const netAmountForSeller = amountInEuros - platformFeeInEuros;
    const amountInCents = Math.round(netAmountForSeller * 100);

    const transfer = await this.stripe.transfers.create({
      amount: amountInCents,
      currency: 'eur',
      destination: sellerStripeAccountId,
    });

    return transfer;
  }

  constructWebhookEvent(rawBody: Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      sig,
      this.config.get<string>('STRIPE_WEBHOOK_SECRET')!,
    );
  }
}
