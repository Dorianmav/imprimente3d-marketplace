import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotificationService, NotificationEvent } from '../notification/notification.service';
import { WorkersService } from '../workers/workers.service';

// ========================
// Constants (CDC §7.1, §7.4)
// ========================

const PRICE_MIN_CENTS = 300; // 3.00€ minimum (CDC §7.1)
const COMMISSION_PCT = 3; // 3% variable
const COMMISSION_FIXED_CENTS = 80; // 0.80€ fixe

/**
 * Calculate commission with proper rounding (CDC §7.1):
 * round(montant_produit × pct / 100) + fixed
 * half-up rounding to nearest cent
 */
function calculateCommission(prixProduitCents: number): {
  pct: number;
  fixed: number;
  total: number;
} {
  const variable = Math.round(prixProduitCents * COMMISSION_PCT / 100);
  return {
    pct: COMMISSION_PCT / 100,
    fixed: COMMISSION_FIXED_CENTS,
    total: variable + COMMISSION_FIXED_CENTS,
  };
}

/**
 * Calculate total amount for the buyer
 * Total = prixProduit + fraisLivraison + commission
 */
function calculateTotalAcheteur(prixProduitCents: number, fraisLivraisonCents: number, commissionTotal: number): number {
  return prixProduitCents + fraisLivraisonCents + commissionTotal;
}

/**
 * Calculate shipping deadline (CDC §7.3):
 * date_limite_expedition = date_paiement + delai_vendeur + grace_days
 * Capped at MAX_SHIPPING_DAYS (21 days)
 */
function calculateShippingDeadline(
  paiementDate: Date,
  vendeurDelaiJours: number,
  graceDays: number,
  maxShippingDays: number,
): Date {
  const rawDays = vendeurDelaiJours + graceDays;
  const effectiveDays = Math.min(rawDays, maxShippingDays);
  return new Date(paiementDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
}

/**
 * DTO for creating an order
 */
export interface CreateCommandeDto {
  sourceType: string;
  sourceId: string;
  quantite?: number;
  modeLivraison: string;
  adresseLivraison?: Record<string, unknown>;
  codeRemise?: string;
}

@Injectable()
export class CommandeService {
  private readonly logger = new Logger(CommandeService.name);

  // CDC §7.4 configurable constants
  private readonly CHECKOUT_TTL_MINUTES: number;
  private readonly SHIPPING_GRACE_DAYS: number;
  private readonly MAX_SHIPPING_DAYS: number;
  private readonly RELEASE_DELAY_SHIPPED_DAYS: number;
  private readonly RELEASE_DELAY_HANDOVER_DAYS: number;
  private readonly DELIVERY_CONFIRMATION_REMINDER_DAYS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly workersService: WorkersService,
  ) {
    this.CHECKOUT_TTL_MINUTES = this.configService.get('CHECKOUT_TTL_MINUTES', 30);
    this.SHIPPING_GRACE_DAYS = this.configService.get('SHIPPING_GRACE_DAYS', 3);
    this.MAX_SHIPPING_DAYS = this.configService.get('MAX_SHIPPING_DAYS', 21);
    this.RELEASE_DELAY_SHIPPED_DAYS = this.configService.get('RELEASE_DELAY_SHIPPED_DAYS', 7);
    this.RELEASE_DELAY_HANDOVER_DAYS = this.configService.get('RELEASE_DELAY_HANDOVER_DAYS', 3);
    this.DELIVERY_CONFIRMATION_REMINDER_DAYS = this.configService.get('DELIVERY_CONFIRMATION_REMINDER_DAYS', 5);
  }

  // ============================================
  // Create order (CDC §8.1, §8.2, §8.3)
  // ============================================

  /**
   * Create an order from a listing, accepted quote, or accepted offer.
   * Stock reservation handled by caller (vente.service or devis.service).
   */
  async create(userId: string, dto: CreateCommandeDto) {
    let prixProduit = 0;
    let fraisLivraison = 0;
    let vendeurId = '';
    let vendeurDelaiJours = 0;
    let typeDisponibilite: string | null = null;
    let stock: number | null = null;

    if (dto.sourceType === 'DEVIS' || dto.sourceType === 'OFFRE_MESSAGERIE') {
      const devis = await this.prisma.devis.findUnique({
        where: { id: dto.sourceId, statut: 'ACCEPTE' },
        include: { demande: true, imprimeur: true },
      });

      if (!devis) {
        throw new NotFoundException('Devis accepté non trouvé');
      }

      prixProduit = devis.prixProduit;
      fraisLivraison = devis.fraisLivraison;
      vendeurId = devis.imprimeurId;
    } else {
      const vente = await this.prisma.annonceVente.findUnique({
        where: { id: dto.sourceId, statut: 'ACTIVE' },
      });

      if (!vente) {
        throw new NotFoundException('Annonce non trouvée ou inactive');
      }

      prixProduit = vente.prixProduit;
      fraisLivraison = vente.fraisLivraison;
      vendeurId = vente.vendeurId;
      vendeurDelaiJours = vente.delaiExpeditionJours;
      typeDisponibilite = vente.typeDisponibilite ?? null;
      stock = vente.stock ?? null;
    }

    if (userId === vendeurId) {
      throw new ConflictException('Impossible d\'acheter votre propre annonce');
    }

    if (prixProduit < PRICE_MIN_CENTS) {
      throw new BadRequestException(`Le prix minimum est de ${PRICE_MIN_CENTS} centimes (${PRICE_MIN_CENTS / 100}€)`);
    }

    // Validate main_propre code
    if (dto.modeLivraison === 'MAIN_PROPRE' && dto.codeRemise) {
      if (dto.codeRemise.length !== 6 || !/^\d{6}$/.test(dto.codeRemise)) {
        throw new BadRequestException('Code de remise invalide: 6 chiffres requis');
      }
    }

    const quantite = dto.quantite || 1;
    const commission = calculateCommission(prixProduit * quantite);
    const totalAcheteur = calculateTotalAcheteur(prixProduit * quantite, fraisLivraison, commission.total);

    const commande = await this.prisma.$transaction(async (tx) => {
      // Reserve stock for STOCK_LIMITE and PIECE_UNIQUE (CDC §8.1)
      if (typeDisponibilite && typeDisponibilite !== 'TOUJOURS_DISPO') {
        if (typeDisponibilite === 'PIECE_UNIQUE' && quantite > 1) {
          throw new ConflictException('Article unique disponible — une seule unité');
        }
        await tx.annonceVente.update({
          where: { id: dto.sourceId },
          data: {
            ...(typeDisponibilite === 'STOCK_LIMITE' && {
              stock: { decrement: quantite },
              ...(stock === quantite && { statut: 'EN_PAUSE' as any }),
            }),
            ...(typeDisponibilite === 'PIECE_UNIQUE' && { statut: 'EN_PAUSE' as any }),
          },
        });
        this.logger.log(`Stock reserved for new commande: -${quantite} (type: ${typeDisponibilite})`);
      }

      // Create the order
      return tx.commande.create({
        data: {
          acheteurId: userId,
          vendeurId,
          sourceType: dto.sourceType as any,
          sourceId: dto.sourceId,
          quantite,
          modeLivraison: dto.modeLivraison as any,
          adresseLivraison: dto.adresseLivraison as any,
          montantProduit: prixProduit * quantite,
          fraisLivraison,
          commissionPct: commission.pct,
          commissionFixe: commission.fixed,
          commissionTotale: commission.total,
          montantTotalAcheteur: totalAcheteur,
          montantRembourse: 0, // Not yet determined
          statut: 'EN_ATTENTE_PAIEMENT',
          // dateLimiteExpedition calculated at payment confirmation (CDC §7.3)
        },
      });
    });

    this.logger.log(`Commande ${commande.id} créée par l'acheteur ${userId}`);

    // Schedule checkout expiration (stock reservation window)
    await this.workersService.scheduleCheckoutExpiration(
      commande.id,
      this.CHECKOUT_TTL_MINUTES * 60 * 1000,
    );

    return commande;
  }

  // ============================================
  // Get orders
  // ============================================

  async findByUser(userId: string, role: 'acheteur' | 'vendeur', statut?: string) {
    const where: Record<string, unknown> = {};

    if (role === 'acheteur') {
      where.acheteurId = userId;
    } else {
      where.vendeurId = userId;
    }

    if (statut) {
      where.statut = statut;
    }

    const orders = await this.prisma.commande.findMany({
      where,
      include: {
        acheteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        vendeur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        avis: {
          select: {
            id: true,
            note: true,
            commentaire: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { orders, role };
  }

  async findById(id: string, userId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: {
        acheteur: {
          select: { id: true, nom: true, prenom: true, email: true, avatar: true },
        },
        vendeur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
        litige: true,
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.acheteurId !== userId && commande.vendeurId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    return commande;
  }

  // ============================================
  // Payment confirmation (CDC §7.2)
  // ============================================

  /**
   * Confirm payment — called after Stripe webhook payment_intent.succeeded.
   * Calculates shipping deadline and schedules workers.
   */
  async confirmPayment(id: string, userId: string, stripePaymentIntentId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: {
        vendeur: { select: { nom: true, prenom: true } },
        acheteur: { select: { nom: true, prenom: true } },
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.acheteurId !== userId) {
      throw new ForbiddenException('Seul l\'acheteur peut confirmer le paiement');
    }

    if (commande.statut !== 'EN_ATTENTE_PAIEMENT') {
      throw new ConflictException('La commande n\'est pas en attente de paiement');
    }

    // Calculate shipping deadline (CDC §7.3)
    let vendeurDelaiJours = 0;
    if (commande.sourceType === 'ANNONCE_VENTE') {
      const vente = await this.prisma.annonceVente.findUnique({
        where: { id: commande.sourceId },
        select: { delaiExpeditionJours: true },
      });
      vendeurDelaiJours = vente?.delaiExpeditionJours ?? 0;
    }

    const datePaiement = new Date();
    const dateLimiteExpedition = calculateShippingDeadline(
      datePaiement,
      vendeurDelaiJours,
      this.SHIPPING_GRACE_DAYS,
      this.MAX_SHIPPING_DAYS,
    );

    const updated = await this.prisma.commande.update({
      where: { id },
      data: {
        statut: 'PAYEE',
        stripePaymentIntentId,
        datePaiement,
        dateLimiteExpedition,
        dateLiberationPrevue: new Date(Date.now() + this.RELEASE_DELAY_SHIPPED_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    // Cancel checkout expiration timer
    await this.workersService.cancelCheckoutExpiration(id);

    // Schedule shipping deadline worker (non-expedition auto-cancel)
    const shippingDeadlineMs = (dateLimiteExpedition.getTime() - Date.now());
    await this.workersService.scheduleOrderExpiration(
      id,
      shippingDeadlineMs > 0 ? shippingDeadlineMs : 24 * 60 * 60 * 1000, // Minimum 1 day
    );

    // Schedule fund liberation worker (after delivery confirmation)
    const liberationDelay = this.RELEASE_DELAY_SHIPPED_DAYS * 24 * 60 * 60 * 1000;
    await this.workersService.scheduleOrderExpiration(
      id,
      liberationDelay,
    );

    // Notify seller: order paid
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'ORDER_PAID',
      data: {
        userName: commande.vendeur.nom,
        itemName: `Commande ${id}`,
        amount: commande.montantTotalAcheteur,
      },
    });

    this.logger.log(`Commande ${id} payée — vendeur notifié, deadline: ${dateLimiteExpedition.toISOString()}`);
    return updated;
  }

  // ============================================
  // Shipping (CDC §8.1)
  // ============================================

  async shipOrder(id: string, userId: string, trackingInfo?: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: { acheteur: { select: { nom: true, prenom: true } } },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.vendeurId !== userId) {
      throw new ForbiddenException('Seul le vendeur peut marquer comme expédié');
    }

    if (commande.statut !== 'PAYEE') {
      throw new ForbiddenException('La commande doit être payée avant expédition');
    }

    const updated = await this.prisma.commande.update({
      where: { id },
      data: {
        statut: 'EXPEDIEE',
        trackingInfo: trackingInfo ?? null,
        dateExpedition: new Date(),
      },
    });

    // Notify buyer: order shipped
    await this.notificationService.sendNotification({
      userId: commande.acheteurId,
      event: 'DELIVERY_CONFIRMATION_PENDING',
      data: {
        userName: commande.acheteur.nom,
        message: `Votre commande a été expédiée${trackingInfo ? ` (suivi: ${trackingInfo})` : ''}`,
      },
    });

    // Schedule delivery confirmation reminder (J+5)
    await this.workersService.scheduleOrderExpiration(
      id,
      this.DELIVERY_CONFIRMATION_REMINDER_DAYS * 24 * 60 * 60 * 1000,
    );

    this.logger.log(`Commande ${id} expédiée — acheteur notifié`);
    return updated;
  }

  // ============================================
  // Receipt confirmation (CDC §7.3)
  // ============================================

  async confirmReceipt(id: string, userId: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: { vendeur: { select: { nom: true, prenom: true } } },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.acheteurId !== userId) {
      throw new ForbiddenException('Seul l\'acheteur peut confirmer la réception');
    }

    if (commande.statut !== 'EXPEDIEE') {
      throw new ForbiddenException('La commande doit être expédiée avant de confirmer la réception');
    }

    const updated = await this.prisma.commande.update({
      where: { id },
      data: {
        statut: 'LIVREE',
        dateLivraisonConfirmee: new Date(),
        dateLiberationEffectiva: new Date(),
      },
    });

    // Notify seller: funds will be released
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'FUNDS_RELEASE_IMMINENT',
      data: {
        userName: commande.vendeur.nom,
        amount: commande.montantProduit,
      },
    });

    // Schedule review publication (double-blind, 48h after delivery)
    await this.workersService.scheduleReviewPublish(id, 48 * 60 * 60 * 1000);

    this.logger.log(`Commande ${id} livrée — vendeur notifié, avis planifié`);
    return updated;
  }

  // ============================================
  // Handover confirmation (main propre)
  // ============================================

  /**
   * Confirm handover (main propre) — buyer confirms receipt or enters code.
   */
  async confirmHandover(id: string, userId: string, codeRemise?: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: { vendeur: { select: { nom: true } } },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.acheteurId !== userId) {
      throw new ForbiddenException('Seul l\'acheteur peut confirmer la remise');
    }

    if (commande.modeLivraison !== 'MAIN_PROPRE') {
      throw new BadRequestException('Cette fonctionnalité est réservée aux remises en main propre');
    }

    if (commande.statut !== 'PAYEE') {
      throw new BadRequestException('La commande doit être payée avant remise');
    }

    // If code required, validate it
    if (commande.codeRemise && commande.codeRemise !== codeRemise) {
      throw new BadRequestException('Code de remise invalide');
    }

    const updated = await this.prisma.commande.update({
      where: { id },
      data: {
        statut: 'LIVREE',
        dateLivraisonConfirmee: new Date(),
        dateLiberationEffectiva: new Date(),
      },
    });

    // Notify seller: funds released
    await this.notificationService.sendNotification({
      userId: commande.vendeurId,
      event: 'FUNDS_RELEASE_IMMINENT',
      data: {
        userName: commande.vendeur.nom,
        amount: commande.montantProduit,
      },
    });

    // Schedule review
    await this.workersService.scheduleReviewPublish(id, 48 * 60 * 60 * 1000);

    this.logger.log(`Commande ${id} remise confirmée`);
    return updated;
  }

  // ============================================
  // Cancel order
  // ============================================

  async cancelOrder(id: string, userId: string, motif?: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: { acheteur: true, vendeur: true },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.acheteurId !== userId && commande.vendeurId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    if (commande.statut === 'LIVREE' || commande.statut === 'REMBOURSEE') {
      throw new ForbiddenException('Impossible d\'annuler une commande livrée ou remboursée');
    }

    const cancelBy = commande.acheteurId === userId ? 'acheteur' : 'vendeur';

    const updated = await this.prisma.commande.update({
      where: { id },
      data: {
        statut: 'ANNULEE',
        motifAnnulation: motif || cancelBy,
      },
    });

    // Cancel pending workers
    await this.workersService.cancelCheckoutExpiration(id);
    await this.workersService.cancelOrderExpiration(id);

    // Notify the other party
    const otherId = commande.acheteurId === userId ? commande.vendeurId : commande.acheteurId;
    await this.notificationService.sendNotification({
      userId: otherId,
      event: 'ORDER_PAID',
      data: {
        message: `Commande ${id} annulée (${cancelBy})`,
      },
    });

    this.logger.log(`Commande ${id} annulée par ${cancelBy}`);
    return updated;
  }

  // ============================================
  // Admin: Get all orders
  // ============================================

  async findAll(statut?: string, limit = 20, offset = 0) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;

    const [orders, total] = await Promise.all([
      this.prisma.commande.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          acheteur: { select: { id: true, nom: true, prenom: true, email: true } },
          vendeur: { select: { id: true, nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commande.count({ where }),
    ]);

    return { orders, total, limit, offset };
  }
}
