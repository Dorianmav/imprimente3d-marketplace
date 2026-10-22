import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Stripe service — Separate Charges and Transfers (CDC §7.2)
 *
 * Flow:
 * 1. Checkout: PaymentIntent on platform account (capture_method: automatic)
 *    transfer_group = commande_<id>, metadata.commande_id
 * 2. Webhook payment_intent.succeeded → commande PAYEE
 * 3. Liberation: Transfer vers stripeAccountId (montant_produit + frais_livraison)
 *    source_transaction = charge, idempotency key = transfer_<commande_id>
 * 4. Commission = part retenue by platform (not application_fee_amount)
 * 5. Payout to seller: Express account payout schedule
 *
 * Refunds:
 * - Before liberation: Stripe Refunds API on the PaymentIntent
 * - After liberation (fraud): Transfer Reversal
 */
@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe operations will be disabled');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2024-12-18.acacia' as any,
      });
    }
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '') || '';
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!this.configService.get('STRIPE_SECRET_KEY');
  }

  // ============================================
  // Payment — Separate Charges (CDC §7.2)
  // ============================================

  /**
   * Create a PaymentIntent for an order (platform account).
   * Funds captured immediately on platform, held until liberation.
   * transfer_group = commande_<id> for grouping charges/transfers.
   */
  async createPaymentIntent(commandeId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { acheteur: true, vendeur: true },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== 'EN_ATTENTE_PAIEMENT') {
      throw new BadRequestException('La commande n\'est pas en attente de paiement');
    }

    // Create or retrieve Stripe customer
    let customerId = commande.acheteur.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe!.customers.create({
        email: commande.acheteur.email,
        name: `${commande.acheteur.prenom} ${commande.acheteur.nom}`,
        metadata: { userId: commande.acheteurId },
      });
      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: commande.acheteurId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Ensure seller has a Stripe Connect account
    let sellerAccountId = commande.vendeur.stripeAccountId;
    if (!sellerAccountId) {
      const account = await this.stripe!.accounts.create({
        type: 'express', // Express for marketplace (KYC via hosted page)
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: commande.vendeur.typeCompte === 'pro' ? 'company' : 'individual',
        metadata: { userId: commande.vendeurId },
      });

      await this.prisma.user.update({
        where: { id: commande.vendeurId },
        data: { stripeAccountId: account.id },
      });
    }

    // Create PaymentIntent on PLATFORM account (Separate Charges)
    // capture_method: automatic = capture immediately
    // transfer_group: groups all charges for this order
    // metadata: commande_id for webhook correlation
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: commande.montantTotalAcheteur,
      currency: 'eur',
      customer: customerId,
      capture_method: 'automatic', // Capture immediately
      payment_method_types: ['card'],
      transfer_group: `commande_${commandeId}`,
      metadata: {
        commandeId,
        vendeurId: commande.vendeurId,
        acheteurId: commande.acheteurId,
      },
    });

    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    this.logger.log(`Payment intent ${paymentIntent.id} created for commande ${commandeId}`);

    return {
      clientId: customerId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  }

  // ============================================
  // Webhook handling (CDC §7.2 — idempotent)
  // ============================================

  /**
   * Construct and verify Stripe webhook event (CDC §15.3)
   */
  constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }
    if (!this.webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET not configured');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Deduplicate webhook events (CDC §7.2 — stripe_webhook_events table)
   */
  private async isDuplicateWebhook(eventId: string): Promise<boolean> {
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { eventId },
    });
    return existing !== null;
  }

  private async recordWebhookEvent(eventId: string, type: string, payload: unknown, erreur?: string) {
    await this.prisma.stripeWebhookEvent.create({
      data: {
        eventId,
        type,
        payload: payload as any,
        recuAt: new Date(),
        traiteAt: new Date(),
        erreur,
      },
    });
  }

  /**
   * Handle all Stripe webhook events (CDC §7.2 — idempotent, dedup)
   */
  async handleWebhook(payload: string, signature: string) {
    const event = this.constructWebhookEvent(payload, signature);

    // Deduplication (CDC §7.2)
    if (await this.isDuplicateWebhook(event.id)) {
      this.logger.debug(`Duplicate webhook event: ${event.id}`);
      return { received: true };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event);
          break;

        case 'payment_intent.created':
          this.logger.debug(`Payment intent created: ${(event.data.object as any).id}`);
          break;

        default:
          this.logger.debug(`Unhandled Stripe event: ${event.type}`);
          break;
      }

      await this.recordWebhookEvent(event.id, event.type, event.data.object);
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      await this.recordWebhookEvent(event.id, event.type, event.data.object, error.message);
      throw error;
    }

    return { received: true };
  }

  /**
   * Handle payment_intent.succeeded (CDC §7.2 — source of truth for payment)
   */
  private async handlePaymentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const commandeId = paymentIntent.metadata.commandeId;

    if (!commandeId) {
      this.logger.warn(`Payment succeeded without commandeId: ${paymentIntent.id}`);
      return;
    }

    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { vendeur: { select: { stripeAccountId: true } } },
    });

    if (!commande) {
      this.logger.error(`Commande not found: ${commandeId}`);
      return;
    }

    // Idempotent: skip if already paid
    if (commande.statut === 'PAYEE' || commande.statut === 'LIVREE') {
      this.logger.debug(`Commande ${commandeId} already paid, skipping webhook`);
      return;
    }

    // Verify amount matches (CDC §15.3: montants jamais acceptés du client)
    if (paymentIntent.amount !== commande.montantTotalAcheteur) {
      this.logger.error(
        `Amount mismatch: expected ${commande.montantTotalAcheteur}, got ${paymentIntent.amount}`,
      );
      return; // Don't update — amount mismatch
    }

    // Update order to paid
    const now = new Date();
    const shippingDeadlineDays = parseInt(this.configService.get('SHIPPING_GRACE_DAYS', '3') || '3', 10);
    const maxShippingDays = parseInt(this.configService.get('MAX_SHIPPING_DAYS', '21') || '21', 10);

    // Calculate shipping deadline: payment_date + seller delay + grace days, capped at MAX_SHIPPING_DAYS
    // We need the seller's delay from their profile or listing
    let sellerDelayDays = 0;
    if (commande.sourceType === 'ANNONCE_VENTE') {
      const vente = await this.prisma.annonceVente.findUnique({
        where: { id: commande.sourceId },
        select: { delaiExpeditionJours: true },
      });
      sellerDelayDays = vente?.delaiExpeditionJours ?? 0;
    }

    const rawDeadline = sellerDelayDays + shippingDeadlineDays;
    const effectiveDeadlineDays = Math.min(rawDeadline, maxShippingDays);

    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'PAYEE',
        datePaiement: now,
        stripePaymentIntentId: paymentIntent.id,
        dateLimiteExpedition: new Date(now.getTime() + effectiveDeadlineDays * 24 * 60 * 60 * 1000),
        dateLiberationPrevue: new Date(now.getTime() + parseInt(this.configService.get('RELEASE_DELAY_SHIPPED_DAYS', '7') || '7', 10) * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Payment confirmed for commande ${commandeId}: ${paymentIntent.id}`);
  }

  /**
   * Handle payment_intent.payment_failed
   */
  private async handlePaymentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const commandeId = paymentIntent.metadata.commandeId;

    if (!commandeId) return;

    // Don't overwrite if already paid or cancelled
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (commande && commande.statut === 'EN_ATTENTE_PAIEMENT') {
      await this.prisma.commande.update({
        where: { id: commandeId },
        data: {
          statut: 'EN_ATTENTE_PAIEMENT', // Remains in pending state
          motifAnnulation: 'non_paiement',
        },
      });
    }

    this.logger.warn(`Payment failed for commande ${commandeId}: ${paymentIntent.last_payment_error?.message ?? 'unknown'}`);
  }

  // ============================================
  // Fund Liberation (CDC §7.2 — Separate Transfers)
  // ============================================

  /**
   * Create a transfer to the seller (Separate Charges and Transfers).
   * Amount = montant_produit + frais_livraison - refunds (CDC §7.2).
   * source_transaction = the original charge.
   * Idempotent via idempotency key transfer_<commande_id>.
   */
  async liberateFunds(commandeId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { vendeur: { select: { stripeAccountId: true } } },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== 'LIVREE' && commande.statut !== 'EXPEDIEE') {
      throw new BadRequestException('Seule une commande livrée ou expédiée peut voir ses fonds libérés');
    }

    if (commande.statut === 'LIVREE' && commande.dateLiberationEffectiva) {
      this.logger.warn(`Funds already liberated for commande ${commandeId}`);
      return { alreadyLiberated: true };
    }

    if (!commande.vendeur.stripeAccountId) {
      this.logger.error(`No Stripe account for seller of commande ${commandeId}`);
      throw new BadRequestException('Vendeur sans compte Stripe configuré');
    }

    if (!commande.stripePaymentIntentId) {
      throw new BadRequestException('Aucun paiement Stripe trouvé');
    }

    // Get the original charge from the PaymentIntent
    const paymentIntent = await this.stripe!.paymentIntents.retrieve(commande.stripePaymentIntentId);
    const charges = (paymentIntent as any).charges?.data as Array<{ id: string }>;
    const charge = charges?.[0];

    if (!charge) {
      throw new BadRequestException('Aucune charge trouvée pour ce paiement');
    }

    // Calculate transfer amount (CDC §7.2)
    // Transfer = montant_produit + frais_livraison - total refunds
    const transferAmount = commande.montantProduit + commande.fraisLivraison - commande.montantRembourse;

    if (transferAmount <= 0) {
      this.logger.warn(`Transfer amount is zero or negative for commande ${commandeId}: ${transferAmount}`);
      await this.prisma.commande.update({
        where: { id: commandeId },
        data: { statut: 'LIVREE', dateLiberationEffectiva: new Date() },
      });
      return { alreadyLiberated: true };
    }

    // Create transfer with idempotency key (CDC §7.2)
    try {
      const transfer = await this.stripe!.transfers.create(
        {
          amount: transferAmount,
          currency: 'eur',
          destination: commande.vendeur.stripeAccountId,
          transfer_group: commande.stripePaymentIntentId,
          source_transaction: charge.id,
          metadata: {
            commandeId,
            plateformeCommission: commande.commissionTotale.toString(),
          },
        },
        { idempotencyKey: `transfer_${commandeId}` },
      );

      // Update order
      await this.prisma.commande.update({
        where: { id: commandeId },
        data: {
          statut: 'LIVREE',
          stripeTransferId: transfer.id,
          dateLiberationEffectiva: new Date(),
        },
      });

      this.logger.log(`Transfer ${transfer.id} created for commande ${commandeId} (${transferAmount} cents)`);
      return { liberated: true, transferId: transfer.id };
    } catch (error) {
      this.logger.error(`Transfer failed for commande ${commandeId}: ${error.message}`);
      throw new BadRequestException(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Process a refund via Stripe Refunds API (CDC §7.2, §8.4)
   * Full refund: product + shipping + commission returned
   * Partial refund: product + shipping only, commission retained unless admin decides otherwise
   */
  async refundOrder(commandeId: string, montantCents: number, reason: 'fraud' | 'dispute' | 'cancellation' = 'cancellation') {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { acheteur: true, vendeur: true },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (!commande.stripePaymentIntentId) {
      throw new BadRequestException('Aucun paiement Stripe trouvé pour cette commande');
    }

    // Check if already refunded
    if (commande.statut === 'REMBOURSEE') {
      this.logger.warn(`Commande ${commandeId} already refunded`);
      return { alreadyRefunded: true };
    }

    // Determine if transfer already happened
    if (commande.stripeTransferId) {
      // Transfer already made — need Transfer Reversal (CDC §7.2)
      return this.refundAfterTransfer(commande, montantCents, reason);
    }

    // Normal refund: Stripe Refunds API on PaymentIntent
    const refund = await this.stripe!.refunds.create({
      payment_intent: commande.stripePaymentIntentId,
      amount: montantCents,
      reason: reason === 'fraud' ? 'fraudulent' : 'requested_by_customer',
      metadata: {
        commandeId,
        adminRefund: 'true',
      },
    });

    // Update order
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'REMBOURSEE',
        montantRembourse: commande.montantRembourse + montantCents,
        dateLiberationEffectiva: new Date(),
      },
    });

    this.logger.log(`Refund ${refund.id} processed for commande ${commandeId} (${montantCents} cents)`);
    return refund;
  }

  /**
   * Refund after transfer has already been made (fraud case, CDC §7.2)
   * Requires Transfer Reversal + refund, risk borne by platform
   */
  private async refundAfterTransfer(commande: any, montantCents: number, reason: string) {
    // Get the transfer
    const transfer = await this.stripe!.transfers.retrieve(commande.stripeTransferId);

    // Reverse the transfer (platform bears the risk, CDC §7.2)
    const reversal = await (this.stripe as any).transferReversal(commande.stripePaymentIntentId, {
      amount: montantCents,
      reason: reason === 'fraud' ? 'fraudulent' : 'requested_by_customer',
      metadata: { commandeId: commande.id },
    });

    // Also refund the PaymentIntent if not already refunded
    await this.stripe!.refunds.create({
      payment_intent: commande.stripePaymentIntentId,
      amount: montantCents,
      reason: reason === 'fraud' ? 'fraudulent' : 'requested_by_customer',
      metadata: { commandeId: commande.id },
    });

    // Update order
    await this.prisma.commande.update({
      where: { id: commande.id },
      data: {
        statut: 'REMBOURSEE',
        montantRembourse: montantCents,
      },
    });

    this.logger.warn(`Transfer reversal ${reversal.id} processed for commande ${commande.id} (platform risk)`);
    return reversal;
  }

  /**
   * Full refund (amount from commande)
   */
  async fullRefundOrder(commandeId: string) {
    return this.refundOrder(commandeId, commandeId
      ? (await this.prisma.commande.findUnique({ where: { id: commandeId } }))?.montantTotalAcheteur ?? 0
      : 0, 'cancellation');
  }

  // ============================================
  // Seller Onboarding (Express)
  // ============================================

  /**
   * Create a Stripe Connect Express account for a seller
   * Express = hosted onboarding page (KYC)
   */
  async createSellerAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.stripeAccountId) {
      return { accountId: user.stripeAccountId, alreadyCreated: true };
    }

    const account = await (this.stripe!.accounts as any).create({
      type: 'express', // Hosted onboarding page
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: user.typeCompte === 'pro' ? 'company' : 'individual',
      metadata: { userId },
      controller: {
        losses: { payments: true }, // Platform absorbs payment losses
        fees: { payer: 'application', feeLossesWebhookEventType: 'payment_failed' },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingComplete: false,
      },
    });

    this.logger.log(`Stripe Express account ${account.id} created for user ${userId}`);

    return { accountId: account.id };
  }

  /**
   * Get the hosted onboarding URL for seller KYC
   */
  async getAccountLink(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripeAccountId) {
      throw new NotFoundException('Compte Stripe non trouvé');
    }

    const accountLink = await this.stripe!.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${this.configService.get('APP_URL', 'http://localhost:3000')}/stripe/refresh`,
      return_url: `${this.configService.get('APP_URL', 'http://localhost:3000')}/stripe/return`,
      type: 'account_onboarding',
      collection_options: {
        fields: 'currently_due',
      },
    });

    return { url: accountLink.url };
  }

  /**
   * Check if onboarding is complete
   */
  async checkOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripeAccountId) return false;

    const account = await (this.stripe!.accounts as any).retrieve(user.stripeAccountId);
    const isComplete = account.details_submitted && !account.payments_required;

    // Update database if status changed
    if (isComplete !== user.stripeOnboardingComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeOnboardingComplete: isComplete },
      });
    }

    return isComplete;
  }

  // ============================================
  // Transfer Management
  // ============================================

  /**
   * Retry a failed transfer (relance par job en cas d'échec, CDC §7.2)
   */
  async retryTransfer(commandeId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { vendeur: { select: { stripeAccountId: true } } },
    });

    if (!commande || !commande.stripePaymentIntentId) {
      throw new NotFoundException('Commande ou paiement non trouvé');
    }

    // Check if transfer already exists
    if (commande.stripeTransferId) {
      const transfer = await (this.stripe!.transfers as any).retrieve(commande.stripeTransferId);
      if ((transfer as any).status === 'paid') {
        await this.prisma.commande.update({
          where: { id: commandeId },
          data: { statut: 'LIVREE', dateLiberationEffectiva: new Date() },
        });
        return { alreadyPaid: true };
      }
      // Transfer pending — alert admin
      this.logger.warn(`Transfer ${commande.stripeTransferId} still pending for commande ${commandeId}`);
      return { transferPending: true, transferId: commande.stripeTransferId };
    }

    // Retry the transfer
    return this.liberateFunds(commandeId);
  }
}
