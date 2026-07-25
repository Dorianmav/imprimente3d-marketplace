import {
  Controller,
  Post,
  UseGuards,
  Req,
  RawBodyRequest,
  Get,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('onboarding-link')
  async getOnboardingLink(@Req() req: any) {
    const userId = req.user.id;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      const account = await this.stripeService.createConnectedAccount(
        userId,
        user.email,
        user.nom,
        user.prenom,
        user.typeCompte,
      );
      stripeAccountId = account.id;
    }

    const url = await this.stripeService.createOnboardingLink(stripeAccountId);
    return { url };
  }

  @Get('dashboard-link')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardLink(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.stripeAccountId) {
      throw new BadRequestException('Aucun compte Stripe associé');
    }

    const url = await this.stripeService.createExpressDashboardLink(
      user.stripeAccountId,
    );
    return { url };
  }

  @Get('wallet/balance')
  @UseGuards(AuthGuard('jwt'))
  async getWalletBalance(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.stripeAccountId) {
      throw new BadRequestException('Aucun compte Stripe associé');
    }

    return this.stripeService.getWalletBalance(user.stripeAccountId);
  }

  @Post('wallet/payout')
  @UseGuards(AuthGuard('jwt'))
  async requestPayout(@Req() req: any, @Body('amount') amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.stripeAccountId) {
      throw new BadRequestException('Aucun compte Stripe associé');
    }

    return this.stripeService.requestPayout(user.stripeAccountId, amount);
  }

  @Post('create-payment-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Body('amount') amount: number,
    @Body('orderId') orderId: string,
  ) {
    if (!amount || !orderId) {
      throw new BadRequestException('Montant et orderId requis');
    }

    return this.stripeService.createPaymentIntent(amount, orderId);
  }

  // 6. Webhook Stripe
  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    const event = this.stripeService.constructWebhookEvent(req.rawBody!, sig);

    const alreadyProcessed = await this.prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id },
    });
    if (alreadyProcessed) {
      return { received: true };
    }

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const isComplete = account.charges_enabled && account.payouts_enabled;

        await this.prisma.user.update({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingComplete: isComplete },
        });
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          await this.prisma.commande.update({
            where: { id: orderId },
            data: {
              statut: 'PAYEE',
              stripePaymentIntentId: paymentIntent.id,
            },
          });
        }
        break;
      }
    }

    await this.prisma.stripeWebhookEvent.create({
      data: { id: event.id, type: event.type },
    });

    return { received: true };
  }
}
