import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WorkersService } from '../workers/workers.service';

/**
 * DTO for creating a quote
 */
export interface CreateDevisDto {
  prixProduit: number;
  fraisLivraison: number;
  delaiJours: number;
  materiauPropose: string;
  couleurProposee: string;
  message?: string;
  validiteJours?: number;
}

@Injectable()
export class DevisService {
  private readonly logger = new Logger(DevisService.name);
  private readonly DEVIS_TTL_DAYS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly workersService?: WorkersService,
  ) {
    this.DEVIS_TTL_DAYS = this.configService.get('DEVIS_TTL_DAYS', 30);
  }

  /**
   * T-8.1: Get all quotes for a request
   */
  async findByDemande(demandeId: string) {
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    const devis = await this.prisma.devis.findMany({
      where: { demandeId, statut: { in: ['EN_ATTENTE', 'ACCEPTE', 'REFUSE'] } },
      include: {
        imprimeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
            nbAvis: true,
            imprimeurProfil: {
              select: { delaiMoyenJours: true, materiaux: true, tarifsIndicatifs: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { devis, demande };
  }

  /**
   * T-8.2: Submit a quote (imprimeur)
   */
  async create(imprimeurId: string, demandeId: string, dto: CreateDevisDto) {
    // Verify request exists and is open
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    if (demande.statut !== 'OUVERTE') {
      throw new ConflictException('Cannot quote a non-open request');
    }

    // Verify imprimeur has the required material capability
    const imprimeurProfil = await this.prisma.imprimeurProfil.findUnique({
      where: { userId: imprimeurId },
    });

    if (!imprimeurProfil) {
      throw new ForbiddenException('You must have an approved printer profile to submit quotes');
    }

    // Check if imprimeur supports the material
    if (imprimeurProfil.materiaux && !imprimeurProfil.materiaux.includes(dto.materiauPropose as any)) {
      throw new ForbiddenException('Your printer profile does not support this material');
    }

    // Check for existing active quote from this imprimeur
    const existing = await this.prisma.devis.findFirst({
      where: {
        demandeId,
        imprimeurId,
        statut: 'EN_ATTENTE',
      },
    });

    if (existing) {
      throw new ConflictException('You already have an active quote for this request');
    }

    // Calculate expiration date
    const validiteJusquA = new Date();
    validiteJusquA.setDate(validiteJusquA.getDate() + (dto.validiteJours || this.DEVIS_TTL_DAYS));

    // Create quote
    const devis = await this.prisma.devis.create({
      data: {
        demandeId,
        imprimeurId,
        prixProduit: dto.prixProduit,
        fraisLivraison: dto.fraisLivraison,
        delaiJours: dto.delaiJours,
        materiauPropose: dto.materiauPropose as any,
        couleurProposee: dto.couleurProposee,
        message: dto.message,
        validiteJusquA,
        statut: 'EN_ATTENTE',
      },
      include: {
        demande: {
          select: {
            id: true,
            titre: true,
            budgetMax: true,
          },
        },
        imprimeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Quote ${devis.id} submitted by imprimeur ${imprimeurId} for demande ${demandeId}`);

    return devis;
  }

  /**
   * T-8.3: Get user's quotes
   */
  async findByUser(userId: string, role: 'expediteur' | 'destinataire', statut?: string) {
    const where: Record<string, unknown> = {};

    if (role === 'expediteur') {
      where.imprimeurId = userId;
    } else {
      // For the buyer (request owner)
      where.demande = {
        acheteurId: userId,
      };
    }

    if (statut) {
      where.statut = statut;
    }

    const devis = await this.prisma.devis.findMany({
      where,
      include: {
        demande: {
          select: {
            id: true,
            titre: true,
            description: true,
            budgetMax: true,
          },
        },
        imprimeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { devis, role };
  }

  /**
   * T-8.4: Accept a quote
   */
  async accept(devisId: string, userId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: { demande: true },
    });

    if (!devis) {
      throw new NotFoundException('Quote not found');
    }

    // Only the request owner can accept a quote
    if (devis.demande.acheteurId !== userId) {
      throw new ForbiddenException('Only the request owner can accept a quote');
    }

    if (devis.statut !== 'EN_ATTENTE') {
      throw new ConflictException('Quote is no longer pending');
    }

    if (devis.validiteJusquA < new Date()) {
      throw new ConflictException('Quote has expired');
    }

    // Accept: set status, reject other quotes, schedule payment TTL (CDC §8.2)
    const result = await this.prisma.$transaction(async (tx) => {
      // Accept this quote
      await tx.devis.update({
        where: { id: devisId },
        data: { statut: 'ACCEPTE' },
      });

      // Reject other pending quotes for this demande
      await tx.devis.updateMany({
        where: {
          demandeId: devis.demandeId,
          id: { not: devisId },
          statut: 'EN_ATTENTE',
        },
        data: { statut: 'REFUSE' },
      });

      // Update demande status
      await tx.annonceDemande.update({
        where: { id: devis.demandeId },
        data: { statut: 'CLOTUREE' },
      });

      return { message: 'Quote accepted, other quotes rejected' };
    });

    // Schedule payment expiration (48h TTL for payment — CDC §8.2)
    if (this.workersService) {
      const paymentTtlHours = this.configService.get('DEVIS_PAYMENT_TTL_HOURS', 48);
      await this.workersService.scheduleDevisExpiration(
        devisId,
        paymentTtlHours * 60 * 60 * 1000,
      );
    }

    return result;
  }

  /**
   * T-8.4: Decline a quote
   */
  async decline(devisId: string, userId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: { demande: true },
    });

    if (!devis) {
      throw new NotFoundException('Quote not found');
    }

    if (devis.demande.acheteurId !== userId) {
      throw new ForbiddenException('Only the request owner can decline a quote');
    }

    return this.prisma.devis.update({
      where: { id: devisId },
      data: { statut: 'REFUSE' },
    });
  }

  /**
   * T-8.5: Get quote by ID
   */
  async findById(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        demande: {
          select: {
            id: true,
            titre: true,
            description: true,
            budgetMax: true,
            acheteur: {
              select: { id: true, nom: true, prenom: true, avatar: true },
            },
          },
        },
        imprimeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
            imprimeurProfil: {
              select: { delaiMoyenJours: true, materiaux: true },
            },
          },
        },
      },
    });

    if (!devis) {
      throw new NotFoundException('Quote not found');
    }

    return devis;
  }

  /**
   * T-8.6: Find available imprimeurs for a request
   */
  async findAvailableImprimeurs(demandeId: string) {
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    // Find active imprimeurs who support the requested material
    const imprimeurs = await this.prisma.imprimeurProfil.findMany({
      where: {
        actif: true,
        disponible: true,
        materiaux: demande.materiauSouhaite
          ? { has: demande.materiauSouhaite }
          : undefined,
      },
      select: {
        userId: true,
        delaiMoyenJours: true,
        materiaux: true,
        zoneExpedition: true,
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
            nbAvis: true,
          },
        },
      },
    });

    return { imprimeurs };
  }
}
