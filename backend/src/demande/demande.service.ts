import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, StorageBucket } from '../storage/storage.service';
import { WorkersService } from '../workers/workers.service';

/**
 * DTO for creating a request listing
 */
export interface CreateDemandeDto {
  titre: string;
  description?: string;
  fichier3d?: string; // MinIO key
  photosReference?: string[]; // MinIO keys
  budgetMax?: number; // in cents
  materiauSouhaite?: string;
  couleurSouhaitee?: string;
  quantite?: number;
  livraisonSouhaitee?: string;
  dateExpiration: string; // ISO date string
}

/**
 * DTO for updating a request
 */
export interface UpdateDemandeDto {
  titre?: string;
  description?: string;
  fichier3d?: string;
  photosReference?: string[];
  budgetMax?: number;
  materiauSouhaite?: string;
  couleurSouhaitee?: string;
  quantite?: number;
  livraisonSouhaitee?: string;
  statut?: string;
  dateExpiration?: string;
}

/**
 * Query parameters for request search
 */
export interface DemandeQueryParams {
  materiau?: string;
  tri?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class DemandeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly workersService?: WorkersService,
  ) {}

  /**
   * T-5.1: Create a new request listing
   */
  async create(userId: string, dto: CreateDemandeDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const expirationDate = new Date(dto.dateExpiration);
    if (isNaN(expirationDate.getTime())) {
      throw new Error('Invalid expiration date');
    }

    // Create the request
    const demande = await this.prisma.annonceDemande.create({
      data: {
        acheteurId: userId,
        titre: dto.titre,
        description: dto.description,
        fichier3d: dto.fichier3d,
        photosReference: dto.photosReference || [],
        budgetMax: dto.budgetMax,
        materiauSouhaite: dto.materiauSouhaite as any,
        couleurSouhaitee: dto.couleurSouhaitee,
        quantite: dto.quantite || 1,
        livraisonSouhaitee: dto.livraisonSouhaitee as any,
        statut: 'OUVERTE',
        dateExpiration: expirationDate,
      },
      select: {
        id: true,
        acheteurId: true,
        titre: true,
        description: true,
        fichier3d: true,
        photosReference: true,
        budgetMax: true,
        materiauSouhaite: true,
        couleurSouhaitee: true,
        quantite: true,
        livraisonSouhaitee: true,
        statut: true,
        dateExpiration: true,
        createdAt: true,
      },
    });

    return demande;
  }

  /**
   * T-5.2: Find request by ID
   */
  async findById(id: string) {
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id },
      include: {
        acheteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            noteMoyenne: true,
          },
        },
        devis: {
          include: {
            imprimeur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                noteMoyenne: true,
                imprimeurProfil: {
                  select: { delaiMoyenJours: true, materiaux: true },
                },
              },
            },
          },
        },
      },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    return demande;
  }

  /**
   * T-5.3: Get buyer's requests
   */
  async findByBuyer(
    buyerId: string,
    statut?: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const where: Record<string, unknown> = { acheteurId: buyerId };
    if (statut) {
      where.statut = statut;
    }

    const [requests, total] = await Promise.all([
      this.prisma.annonceDemande.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          titre: true,
          description: true,
          budgetMax: true,
          materiauSouhaite: true,
          quantite: true,
          statut: true,
          dateExpiration: true,
          createdAt: true,
        },
      }),
      this.prisma.annonceDemande.count({ where }),
    ]);

    return { requests, total, limit, offset };
  }

  /**
   * T-5.4: Update request (owner only)
   */
  async update(id: string, userId: string, dto: UpdateDemandeDto) {
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    if (demande.acheteurId !== userId) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    // Cannot update if already closed
    if (demande.statut === 'CLOTUREE' || demande.statut === 'ANNULEE') {
      throw new ForbiddenException('Cannot update a closed or cancelled request');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.titre !== undefined) updateData.titre = dto.titre;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.fichier3d !== undefined) updateData.fichier3d = dto.fichier3d;
    if (dto.photosReference !== undefined) updateData.photosReference = dto.photosReference;
    if (dto.budgetMax !== undefined) updateData.budgetMax = dto.budgetMax;
    if (dto.materiauSouhaite !== undefined) updateData.materiauSouhaite = dto.materiauSouhaite as any;
    if (dto.couleurSouhaitee !== undefined) updateData.couleurSouhaitee = dto.couleurSouhaitee;
    if (dto.quantite !== undefined) updateData.quantite = dto.quantite;
    if (dto.livraisonSouhaitee !== undefined) updateData.livraisonSouhaitee = dto.livraisonSouhaitee as any;
    if (dto.dateExpiration !== undefined) {
      const expDate = new Date(dto.dateExpiration);
      if (!isNaN(expDate.getTime())) updateData.dateExpiration = expDate;
    }

    const updated = await this.prisma.annonceDemande.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * T-5.5: Delete request (owner only)
   */
  async remove(id: string, userId: string) {
    const demande = await this.prisma.annonceDemande.findUnique({
      where: { id },
    });

    if (!demande) {
      throw new NotFoundException('Request not found');
    }

    if (demande.acheteurId !== userId) {
      throw new ForbiddenException('You can only delete your own requests');
    }

    // Soft delete via statut
    await this.prisma.annonceDemande.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });

    return { message: 'Request cancelled' };
  }

  /**
   * T-5.6: List open requests (public)
   */
  async findAll(params: DemandeQueryParams) {
    const where: Record<string, unknown> = {
      statut: 'OUVERTE',
      dateExpiration: { gt: new Date() },
    };

    if (params.materiau) {
      where.materiauSouhaite = params.materiau;
    }

    const orderBy = this.getOrderBy(params.tri || 'recent');

    const [requests, total] = await Promise.all([
      this.prisma.annonceDemande.findMany({
        where,
        orderBy,
        skip: params.offset || 0,
        take: params.limit || 20,
        select: {
          id: true,
          titre: true,
          description: true,
          budgetMax: true,
          materiauSouhaite: true,
          couleurSouhaitee: true,
          quantite: true,
          dateExpiration: true,
          createdAt: true,
        },
      }),
      this.prisma.annonceDemande.count({ where }),
    ]);

    // Ensure the periodic expiration check is scheduled (idempotent via jobId)
    if (this.workersService) {
      await this.workersService.checkDemandeExpiration();
    }

    return { requests, total, ...params };
  }

  /**
   * T-5.7: Search requests with pg_trgm fuzzy matching (Epic 6)
   */
  async search(query: string, materiau?: string, limit: number = 20) {
    // Use ILIKE for fuzzy matching on titre (pg_trgm will use trigram index)
    const where: Record<string, unknown> = {
      statut: 'OUVERTE',
      dateExpiration: { gt: new Date() },
      titre: { contains: query, mode: 'insensitive' },
    };

    if (materiau) {
      where.materiauSouhaite = materiau;
    }

    const requests = await this.prisma.annonceDemande.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        titre: true,
        description: true,
        budgetMax: true,
        materiauSouhaite: true,
        couleurSouhaitee: true,
        quantite: true,
        dateExpiration: true,
        createdAt: true,
      },
    });

    return requests;
  }

  private getOrderBy(tri: string): Record<string, unknown> {
    switch (tri) {
      case 'budget_desc':
        return { budgetMax: 'desc' };
      case 'expiring':
        return { dateExpiration: 'asc' };
      case 'recent':
      default:
        return { createdAt: 'desc' };
    }
  }
}
