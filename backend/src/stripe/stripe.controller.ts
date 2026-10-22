import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StripeService } from './stripe.service';

/**
 * Stripe controller
 * - /stripe/webhook: public endpoint, raw body (no JSON parsing)
 * - Other endpoints: authenticated
 */
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // ============================================
  // Webhook — public, raw body (CDC §15.3)
  // ============================================

  @Post('webhook')
  async webhook(@Headers('stripe-signature') signature: string, req: RawBodyRequest<Request>) {
    // Stripe webhook: use raw body for signature verification
    const rawBody = req.rawBody;
    if (!rawBody || typeof rawBody !== 'string') {
      return { received: true };
    }

    if (!this.stripeService.isConfigured()) {
      return { received: true };
    }

    try {
      return await this.stripeService.handleWebhook(rawBody, signature);
    } catch (error) {
      // Webhook signature verification failed
      throw error;
    }
  }

  // ============================================
  // Payment endpoints
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post('payment-intent/:commandeId')
  async createPaymentIntent(
    @Param('commandeId', new ParseUUIDPipe()) commandeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.stripeService.createPaymentIntent(commandeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('seller/account')
  async createSellerAccount(@CurrentUser('id') userId: string) {
    return this.stripeService.createSellerAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('seller/onboarding')
  async getAccountLink(@CurrentUser('id') userId: string) {
    return this.stripeService.getAccountLink(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/onboarding/check')
  async checkOnboarding(@CurrentUser('id') userId: string) {
    return { complete: await this.stripeService.checkOnboardingComplete(userId) };
  }

  // ============================================
  // Refund endpoints (admin only, CDC §8.4)
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Post('refund/:commandeId')
  async refundOrder(
    @Param('commandeId', new ParseUUIDPipe()) commandeId: string,
    @Body('amount') amount: number,
  ) {
    return this.stripeService.refundOrder(commandeId, amount ?? 0, 'dispute');
  }

  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Post('refund/full/:commandeId')
  async fullRefundOrder(@Param('commandeId', new ParseUUIDPipe()) commandeId: string) {
    return this.stripeService.fullRefundOrder(commandeId);
  }

  // ============================================
  // Transfer management
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Post('transfer/retry/:commandeId')
  async retryTransfer(@Param('commandeId', new ParseUUIDPipe()) commandeId: string) {
    return this.stripeService.retryTransfer(commandeId);
  }
}
