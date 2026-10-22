import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Materiau } from '../generated/prisma';
import { StripeService } from '../stripe/stripe.service';
import { NotificationService } from '../notification/notification.service';

// ========================
// DTOs
// ========================

export interface AdminUserUpdateDto {
  role?: string;
  statut?: string;
  actifVendeur?: boolean;
}

export interface AdminReportActionDto {
  statut: string;
  decision?: string;
  noteAdmin?: string;
}

export interface AdminOrderActionDto {
  statut: string;
  noteAdmin?: string;
}

// ========================
// Admin Service
// ========================

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService?: StripeService,
    private readonly notificationService?: NotificationService,
  ) {}

  // ============================================
  // KPI Dashboard
  // ============================================

  async getDashboard() {
    const [
      totalUsers,
      totalVentes,
      totalDemandes,
      totalCommandes,
      totalLitigesOuverts,
      totalSignalementsOuverts,
      commandesEnAttente,
      commandesPayees,
      commandesExpediees,
      commandesLivrees,
      commandesLitige,
      totalRevenus,
      totalCommission,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.annonceVente.count({ where: { statut: 'ACTIVE' } }),
      this.prisma.annonceDemande.count({ where: { statut: 'OUVERTE' } }),
      this.prisma.commande.count(),
      this.prisma.litige.count({ where: { statut: { in: ['OUVERT', 'EN_ARBITRAGE'] } } }),
      this.prisma.signalement.count({ where: { statut: { in: ['OUVERT', 'EN_COURS'] } } }),
      this.prisma.commande.count({ where: { statut: 'EN_ATTENTE_PAIEMENT' } }),
      this.prisma.commande.count({ where: { statut: 'PAYEE' } }),
      this.prisma.commande.count({ where: { statut: 'EXPEDIEE' } }),
      this.prisma.commande.count({ where: { statut: 'LIVREE' } }),
      this.prisma.commande.count({ where: { statut: 'LITIGE' } }),
      this.prisma.commande.aggregate({
        where: { statut: { in: ['LIVREE', 'REMBOURSEE'] } },
        _sum: { montantTotalAcheteur: true },
      }),
      this.prisma.commande.aggregate({
        where: { statut: { in: ['LIVREE', 'REMBOURSEE'] } },
        _sum: { commissionTotale: true },
      }),
    ]);

    return {
      kpis: {
        totalUsers,
        totalVentesActives: totalVentes,
        totalDemandesOuvertes: totalDemandes,
        totalCommandes,
        totalLitigesOuverts,
        totalSignalementsOuverts,
        commandesEnAttentePaiement: commandesEnAttente,
        commandesPayees,
        commandesExpediees,
        commandesLivrees,
        commandesEnLitige: commandesLitige,
        totalRevenus: totalRevenus._sum.montantTotalAcheteur || 0,
        totalCommission: totalCommission._sum.commissionTotale || 0,
      },
    };
  }

  // ============================================
  // User Management
  // ============================================

  async listUsers(params?: {
    statut?: string;
    role?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut;
    if (params?.role) where.role = params.role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          statut: true,
          typeCompte: true,
          avatar: true,
          avatarUrl: true,
          localisation: true,
          stripeCustomerId: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
          actifVendeur: true,
          noteMoyenne: true,
          nbAvis: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        annoncesVente: {
          select: { id: true, titre: true, statut: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        annoncesDemande: {
          select: { id: true, titre: true, statut: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        commandesAcheteur: {
          select: { id: true, statut: true, montantTotalAcheteur: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        commandesVendeur: {
          select: { id: true, statut: true, montantTotalAcheteur: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        litigesOuverts: {
          select: { id: true, statut: true, motif: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        signalements: {
          select: { id: true, statut: true, motif: true, cibleType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        imprimeurProfil: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async updateUser(userId: string, dto: AdminUserUpdateDto) {
    // Prevent self-modification of role/statut
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.statut !== undefined && { statut: dto.statut }),
        ...(dto.actifVendeur !== undefined && { actifVendeur: dto.actifVendeur }),
      },
    });

    return { message: 'Utilisateur mis à jour' };
  }

  async suspendUser(userId: string, motif?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { statut: 'suspendu' },
    });
  }

  async unsuspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { statut: 'actif' },
    });
  }

  // ============================================
  // Listing Moderation
  // ============================================

  async listListings(params?: {
    type?: 'vente' | 'demande';
    statut?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut;

    let total = 0;
    let listings: any[] = [];

    if (!params?.type || params.type === 'vente') {
      [listings, total] = await Promise.all([
        this.prisma.annonceVente.findMany({
          where,
          select: {
            id: true,
            titre: true,
            categorie: true,
            prixProduit: true,
            statut: true,
            createdAt: true,
            vendeur: {
              select: { id: true, nom: true, prenom: true, email: true, statut: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: params?.offset || 0,
          take: params?.limit || 20,
        }),
        this.prisma.annonceVente.count({ where }),
      ]);
    } else {
      [listings, total] = await Promise.all([
        this.prisma.annonceDemande.findMany({
          where,
          select: {
            id: true,
            titre: true,
            statut: true,
            createdAt: true,
            acheteur: {
              select: { id: true, nom: true, prenom: true, email: true, statut: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: params?.offset || 0,
          take: params?.limit || 20,
        }),
        this.prisma.annonceDemande.count({ where }),
      ]);
    }

    return { listings, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async suspendListing(id: string, type: 'vente' | 'demande') {
    if (type === 'vente') {
      return this.prisma.annonceVente.update({
        where: { id },
        data: { statut: 'SUSPENDU' },
      });
    }
    return this.prisma.annonceDemande.update({
      where: { id },
      data: { statut: 'SUSPENDU' as any },
    });
  }

  async unsuspendListing(id: string, type: 'vente' | 'demande') {
    if (type === 'vente') {
      return this.prisma.annonceVente.update({
        where: { id },
        data: { statut: 'ACTIVE' },
      });
    }
    return this.prisma.annonceDemande.update({
      where: { id },
      data: { statut: 'OUVERTE' as any },
    });
  }

  async deleteListing(id: string, type: 'vente' | 'demande') {
    if (type === 'vente') {
      return this.prisma.annonceVente.delete({ where: { id } });
    }
    return this.prisma.annonceDemande.delete({ where: { id } });
  }

  // ============================================
  // Order Management
  // ============================================

  async listOrders(params?: {
    statut?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut;
    if (params?.userId) where.OR = [{ acheteurId: params.userId }, { vendeurId: params.userId }];

    const [orders, total] = await Promise.all([
      this.prisma.commande.findMany({
        where,
        select: {
          id: true,
          acheteur: { select: { id: true, nom: true, prenom: true, email: true } },
          vendeur: { select: { id: true, nom: true, prenom: true, email: true } },
          statut: true,
          motifAnnulation: true,
          montantProduit: true,
          fraisLivraison: true,
          commissionTotale: true,
          montantTotalAcheteur: true,
          stripePaymentIntentId: true,
          trackingInfo: true,
          dateExpedition: true,
          dateLivraisonConfirmee: true,
          dateLimiteExpedition: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.commande.count({ where }),
    ]);

    return { orders, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async getOrder(orderId: string) {
    return this.prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        acheteur: {
          select: { id: true, nom: true, prenom: true, email: true, statut: true },
        },
        vendeur: {
          select: { id: true, nom: true, prenom: true, email: true, statut: true },
        },
        litige: true,
      },
    });
  }

  async updateOrderStatus(orderId: string, dto: AdminOrderActionDto) {
    await this.prisma.commande.update({
      where: { id: orderId },
      data: {
        statut: dto.statut as any,
      },
    });
    return { message: 'Commande mise à jour' };
  }

  // ============================================
  // Dispute Management
  // ============================================

  async listDisputes(params?: {
    statut?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut;

    const [disputes, total] = await Promise.all([
      this.prisma.litige.findMany({
        where,
        select: {
          id: true,
          commandeId: true,
          statut: true,
          motif: true,
          description: true,
          photos: true,
          reponseVendeur: true,
          reponseAt: true,
          decision: true,
          montantRembourse: true,
          decideParId: true,
          noteAdmin: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
          ouvertPar: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
          commande: {
            select: {
              id: true,
              acheteurId: true,
              vendeurId: true,
              montantTotalAcheteur: true,
              dateExpedition: true,
              dateLivraisonConfirmee: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.litige.count({ where }),
    ]);

    return { disputes, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async getDispute(disputeId: string) {
    return this.prisma.litige.findUnique({
      where: { id: disputeId },
      include: {
        ouvertPar: {
          select: { id: true, nom: true, prenom: true, email: true, avatar: true },
        },
        decidePar: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        commande: {
          select: {
            id: true,
            acheteur: {
              select: { id: true, nom: true, prenom: true, email: true, avatar: true },
            },
            vendeur: {
              select: { id: true, nom: true, prenom: true, email: true, avatar: true },
            },
            montantProduit: true,
            fraisLivraison: true,
            commissionTotale: true,
            montantTotalAcheteur: true,
            stripePaymentIntentId: true,
            modeLivraison: true,
            trackingInfo: true,
            dateExpedition: true,
            dateLivraisonConfirmee: true,
          },
        },
      },
    });
  }

  async arbitrateDispute(
    disputeId: string,
    decision: 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE',
    montantRembourse: number,
    noteAdmin: string,
    adminId: string,
  ) {
    const litige = await this.prisma.litige.findUnique({
      where: { id: disputeId },
      include: { commande: true },
    });

    if (!litige) {
      throw new NotFoundException('Litige non trouvé');
    }

    if (litige.statut === 'CLOS') {
      throw new BadRequestException('Ce litige est déjà clos');
    }

    const result = await this.prisma.litige.update({
      where: { id: disputeId },
      data: {
        decision,
        montantRembourse,
        noteAdmin,
        decideParId: adminId,
        closedAt: new Date(),
        statut: 'CLOS',
      },
      include: {
        commande: {
          select: { acheteurId: true, vendeurId: true, stripePaymentIntentId: true },
        },
      },
    });

    // Process refund via Stripe (CDC §8.4): administrator chooses, we execute
    if (decision !== 'REJETE') {
      let refundAmountCents = 0;

      if (decision === 'REMBOURSE_TOTAL') {
        refundAmountCents = litige.commande.montantTotalAcheteur;
      } else if (decision === 'REMBOURSE_PARTIEL' && montantRembourse) {
        // montantRembourse is in cents
        refundAmountCents = montantRembourse;
      }

      if (refundAmountCents > 0 && this.stripeService && litige.commande.stripePaymentIntentId) {
        try {
          await this.stripeService.refundOrder(
            litige.commande.id,
            refundAmountCents,
            'dispute',
          );
        } catch (error) {
          this.logger.error(
            `Stripe refund failed for commande ${litige.commandeId}: ${error.message}`,
          );
          await this.prisma.adminAuditLog.create({
            data: {
              acteurId: adminId,
              action: 'dispute_refund_failed',
              cibleType: 'commande',
              cibleId: litige.commandeId,
              details: { error: error.message, decision, refundAmount: refundAmountCents },
            },
          });
        }
      }
    }

    // Update order status
    await this.prisma.commande.update({
      where: { id: litige.commandeId },
      data: {
        statut: decision === 'REJETE' ? 'LIVREE' : 'REMBOURSEE',
        montantRembourse: decision === 'REJETE' ? 0 : montantRembourse,
      },
    });

    // Notify both parties (CDC §8.4)
    if (this.notificationService) {
      const baseMsg = `Litige ${litige.id} tranché`;
      await this.notificationService.sendNotification({
        userId: litige.commande.acheteurId,
        event: 'DELIVERY_CONFIRMATION_PENDING',
        data: { message: `${baseMsg}: ${decision === 'REMBOURSE_TOTAL' ? 'Remboursement total' : decision === 'REMBOURSE_PARTIEL' ? 'Remboursement partiel' : 'Litige rejeté'}`, },
      });
      await this.notificationService.sendNotification({
        userId: litige.commande.vendeurId,
        event: 'QUOTE_ACCEPTED',
        data: { message: `${baseMsg}: ${decision === 'REMBOURSE_TOTAL' ? 'Remboursement total demandé' : decision === 'REMBOURSE_PARTIEL' ? 'Remboursement partiel' : 'Litige rejeté — fonds libérés'}`, },
      });
    }

    return result;
  }

  // ============================================
  // Report Management
  // ============================================

  async listReports(params?: {
    statut?: string;
    cibleType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut;
    if (params?.cibleType) where.cibleType = params.cibleType as any;

    const [reports, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where,
        select: {
          id: true,
          cibleType: true,
          cibleId: true,
          motif: true,
          description: true,
          statut: true,
          decision: true,
          noteAdmin: true,
          createdAt: true,
          updatedAt: true,
          reporter: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
          conversation: {
            select: { id: true },
          },
          traitePar: {
            select: { id: true, nom: true, prenom: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.signalement.count({ where }),
    ]);

    return { reports, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async getReport(reportId: string) {
    return this.prisma.signalement.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, nom: true, prenom: true, email: true, avatar: true, statut: true },
        },
        traitePar: {
          select: { id: true, nom: true, prenom: true },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20,
              include: {
                expediteur: {
                  select: { id: true, nom: true, prenom: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async actionReport(reportId: string, dto: AdminReportActionDto, adminId: string) {
    const report = await this.prisma.signalement.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    const result = await this.prisma.signalement.update({
      where: { id: reportId },
      data: {
        statut: dto.statut as any,
        decision: dto.decision,
        noteAdmin: dto.noteAdmin,
        traiteParId: adminId,
      },
    });

    // Suspend targeted user and delete listings (CDC §12.3)
    if (report.cibleType === 'UTILISATEUR' && dto.statut === 'TRAITE' && dto.decision === 'SUSPENDRE') {
      await this.prisma.$transaction(async (tx) => {
        // Suspend user account
        await tx.user.update({
          where: { id: report.cibleId },
          data: { statut: 'BANNI' as any },
        });

        // Deactivate all user's annonces (both vente and demande)
        await tx.annonceVente.updateMany({
          where: { vendeurId: report.cibleId, statut: 'ACTIVE' },
          data: { statut: 'EN_PAUSE' },
        });
        await tx.annonceDemande.updateMany({
          where: { acheteurId: report.cibleId, statut: 'OUVERTE' },
          data: { statut: 'CLOTUREE' },
        });

        // Record in audit log
        await tx.adminAuditLog.create({
          data: {
            acteurId: adminId,
            action: 'user_suspended',
            cibleType: 'utilisateur',
            cibleId: report.cibleId,
            details: { reason: report.motif, reportId },
          },
        });
      });
    } else if ((report.cibleType === 'ANNONCE_VENTE' || report.cibleType === 'ANNONCE_DEMANDE') && dto.statut === 'TRAITE' && dto.decision === 'SUPPRIMER') {
      // Delete targeted listing
      await this.prisma.$transaction(async (tx) => {
        // Soft-delete based on type
        if (report.cibleType === 'ANNONCE_VENTE') {
          await tx.annonceVente.update({
            where: { id: report.cibleId },
            data: { statut: 'SUPPRIMEE' as any },
          });
        } else {
          await tx.annonceDemande.update({
            where: { id: report.cibleId },
            data: { statut: 'CLOTUREE' as any },
          });
        }

        await tx.adminAuditLog.create({
          data: {
            acteurId: adminId,
            action: 'listing_removed',
            cibleType: report.cibleType.toLowerCase() as any,
            cibleId: report.cibleId,
            details: { reason: report.motif, reportId },
          },
        });
      });
    }

    return result;
  }

  // ============================================
  // Quote Management
  // ============================================

  async listQuotes(params?: {
    statut?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.statut) where.statut = params.statut as any;

    const [quotes, total] = await Promise.all([
      this.prisma.devis.findMany({
        where,
        select: {
          id: true,
          statut: true,
          prixProduit: true,
          fraisLivraison: true,
          delaiJours: true,
          materiauPropose: true,
          createdAt: true,
          demande: {
            select: {
              id: true,
              titre: true,
              acheteur: {
                select: { id: true, nom: true, prenom: true, email: true },
              },
            },
          },
          imprimeur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              noteMoyenne: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.devis.count({ where }),
    ]);

    return { quotes, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  // ============================================
  // Imprimeur Management
  // ============================================

  async listImprimeurs(params?: {
    actif?: boolean;
    disponible?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.actif !== undefined) where.actif = params.actif;
    if (params?.disponible !== undefined) where.disponible = params.disponible;

    const [imprimeurs, total] = await Promise.all([
      this.prisma.imprimeurProfil.findMany({
        where,
        select: {
          userId: true,
          bio: true,
          imprimantes: true,
          materiaux: true,
          zoneExpedition: true,
          delaiMoyenJours: true,
          tarifsIndicatifs: true,
          actif: true,
          disponible: true,
          enPauseDepuis: true,
          pauseOrigine: true,
          user: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              statut: true,
              noteMoyenne: true,
              nbAvis: true,
              stripeOnboardingComplete: true,
              createdAt: true,
            },
          },
        },
        orderBy: { user: { createdAt: 'desc' } },
        skip: params?.offset || 0,
        take: params?.limit || 20,
      }),
      this.prisma.imprimeurProfil.count({ where }),
    ]);

    return { imprimeurs, total, limit: params?.limit || 20, offset: params?.offset || 0 };
  }

  async toggleImprimeurDisponibilite(userId: string, disponible: boolean) {
    return this.prisma.imprimeurProfil.upsert({
      where: { userId },
      update: { disponible },
      create: {
        userId,
        delaiMoyenJours: 7,
        disponible,
        materiaux: ['PLA'] as any,
      } as any,
      select: { disponible: true },
    });
  }
}
