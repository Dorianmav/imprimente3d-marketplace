import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, StorageBucket } from '../storage/storage.service';

/**
 * DTO for creating a sale listing (Epic 4)
 */
export interface CreateVenteDto {
  titre: string;
  description: string;
  categorie: string;
  materiau: string;
  couleur: string;
  prixProduit: number; // in cents
  typeDisponibilite?: string;
  stock?: number;
  delaiExpeditionJours?: number;
  modeLivraison: string;
  fraisLivraison: number; // in cents
  poidsG?: number;
  offresAutorisees?: boolean;
  photos?: string[]; // MinIO keys
}

/**
 * DTO for updating a sale listing
 */
export interface UpdateVenteDto {
  titre?: string;
  description?: string;
  categorie?: string;
  materiau?: string;
  couleur?: string;
  prixProduit?: number;
  typeDisponibilite?: string;
  stock?: number;
  delaiExpeditionJours?: number;
  modeLivraison?: string;
  fraisLivraison?: number;
  poidsG?: number;
  offresAutorisees?: boolean;
  statut?: string;
  photos?: string[];
}

/**
 * Query parameters for listing search
 */
export interface VenteQueryParams {
  categorie?: string;
  materiau?: string;
  tri?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class VenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * T-4.1: Create a new sale listing
   */
  async create(userId: string, dto: CreateVenteDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create the listing
    const vente = await this.prisma.annonceVente.create({
      data: {
        vendeurId: userId,
        titre: dto.titre,
        description: dto.description,
        categorie: dto.categorie as any,
        materiau: dto.materiau as any,
        couleur: dto.couleur,
        photos: dto.photos || [],
        prixProduit: dto.prixProduit,
        typeDisponibilite: dto.typeDisponibilite as any,
        stock: dto.stock,
        delaiExpeditionJours: dto.delaiExpeditionJours || 0,
        modeLivraison: dto.modeLivraison as any,
        fraisLivraison: dto.fraisLivraison,
        poidsG: dto.poidsG,
        offresAutorisees: dto.offresAutorisees !== false,
        statut: 'ACTIVE',
      },
      select: {
        id: true,
        vendeurId: true,
        titre: true,
        description: true,
        categorie: true,
        materiau: true,
        couleur: true,
        photos: true,
        prixProduit: true,
        typeDisponibilite: true,
        stock: true,
        delaiExpeditionJours: true,
        modeLivraison: true,
        fraisLivraison: true,
        poidsG: true,
        offresAutorisees: true,
        statut: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return vente;
  }

  /**
   * T-4.2: Find sale listing by ID
   */
  async findById(id: string) {
    const vente = await this.prisma.annonceVente.findUnique({
      where: { id },
      include: {
        vendeur: {
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

    if (!vente) {
      throw new NotFoundException('Listing not found');
    }

    // Remove photos from public view (only show count)
    const { photos, ...publicVente } = vente;
    return {
      ...publicVente,
      photoCount: (photos || []).length,
      photos, // Keep photos for seller's own view
    };
  }

  /**
   * T-4.3: Get seller's listings
   */
  async findBySeller(
    sellerId: string,
    statut: string,
    limit: number,
    offset: number,
  ) {
    const where: Record<string, unknown> = { vendeurId: sellerId };
    if (statut) {
      where.statut = statut;
    }

    const [listings, total] = await Promise.all([
      this.prisma.annonceVente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          titre: true,
          description: true,
          categorie: true,
          materiau: true,
          couleur: true,
          photos: true,
          prixProduit: true,
          stock: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.annonceVente.count({ where }),
    ]);

    return { listings, total, limit, offset };
  }

  /**
   * T-4.4: Update sale listing (owner only)
   */
  async update(id: string, userId: string, dto: UpdateVenteDto) {
    // Find listing
    const vente = await this.prisma.annonceVente.findUnique({
      where: { id },
    });

    if (!vente) {
      throw new NotFoundException('Listing not found');
    }

    if (vente.vendeurId !== userId) {
      throw new ForbiddenException('You can only edit your own listings');
    }

    // Update
    const updated = await this.prisma.annonceVente.update({
      where: { id },
      data: {
        ...(dto.titre !== undefined && { titre: dto.titre }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categorie !== undefined && { categorie: dto.categorie as any }),
        ...(dto.materiau !== undefined && { materiau: dto.materiau as any }),
        ...(dto.couleur !== undefined && { couleur: dto.couleur }),
        ...(dto.prixProduit !== undefined && { prixProduit: dto.prixProduit }),
        ...(dto.typeDisponibilite !== undefined && { typeDisponibilite: dto.typeDisponibilite as any }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.delaiExpeditionJours !== undefined && { delaiExpeditionJours: dto.delaiExpeditionJours }),
        ...(dto.modeLivraison !== undefined && { modeLivraison: dto.modeLivraison as any }),
        ...(dto.fraisLivraison !== undefined && { fraisLivraison: dto.fraisLivraison }),
        ...(dto.poidsG !== undefined && { poidsG: dto.poidsG }),
        ...(dto.offresAutorisees !== undefined && { offresAutorisees: dto.offresAutorisees }),
        ...(dto.statut !== undefined && { statut: dto.statut as any }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
      },
    });

    return updated;
  }

  /**
   * T-4.5: Delete / archive sale listing (owner only)
   * Soft delete via statut change
   */
  async remove(id: string, userId: string) {
    const vente = await this.prisma.annonceVente.findUnique({
      where: { id },
    });

    if (!vente) {
      throw new NotFoundException('Listing not found');
    }

    if (vente.vendeurId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    // Soft delete: change status to ARCHIVE
    await this.prisma.annonceVente.update({
      where: { id },
      data: { statut: 'ARCHIVE' },
    });

    return { message: 'Listing archived' };
  }

  /**
   * T-4.6: List active listings (public, paginated)
   */
  async findAll(params: VenteQueryParams) {
    const where: Record<string, unknown> = { statut: 'ACTIVE' };

    if (params.categorie) {
      where.categorie = params.categorie;
    }
    if (params.materiau) {
      where.materiau = params.materiau;
    }

    const orderBy = this.getOrderBy(params.tri || 'recent');

    const [listings, total] = await Promise.all([
      this.prisma.annonceVente.findMany({
        where,
        orderBy,
        skip: params.offset || 0,
        take: params.limit || 20,
        select: {
          id: true,
          titre: true,
          description: true,
          categorie: true,
          materiau: true,
          couleur: true,
          photos: true,
          prixProduit: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.annonceVente.count({ where }),
    ]);

    return { listings, total, ...params };
  }

  /**
   * Get sort order based on tri parameter
   */
  private getOrderBy(tri: string): Record<string, unknown> {
    switch (tri) {
      case 'price_asc':
        return { prixProduit: 'asc' };
      case 'price_desc':
        return { prixProduit: 'desc' };
      case 'popular':
        return { createdAt: 'desc' }; // Placeholder: would use view count in V2
      case 'recent':
      default:
        return { createdAt: 'desc' };
    }
  }
}
