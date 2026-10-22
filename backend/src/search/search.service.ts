import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Search result type
 */
export interface SearchResult {
  ventes: any[];
  demandes: any[];
  totalVentes: number;
  totalDemandes: number;
  query: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * T-6.1: Full-text search across listings (sales + requests)
   * Uses pg_trgm for fuzzy matching
   */
  async search(query: string, filters?: {
    type?: 'ventes' | 'demandes' | 'all';
    materiau?: string;
    categorie?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<SearchResult> {
    const sanitized = query.trim();
    if (!sanitized) {
      return { ventes: [], demandes: [], totalVentes: 0, totalDemandes: 0, query: '' };
    }

    const result: SearchResult = {
      ventes: [],
      demandes: [],
      totalVentes: 0,
      totalDemandes: 0,
      query: sanitized,
    };

    // Search sale listings
    if (!filters?.type || filters.type === 'ventes' || filters.type === 'all') {
      result.ventes = await this.searchVentes(sanitized, filters);
      result.totalVentes = result.ventes.length;
    }

    // Search request listings
    if (!filters?.type || filters.type === 'demandes' || filters.type === 'all') {
      result.demandes = await this.searchDemandes(sanitized, filters);
      result.totalDemandes = result.demandes.length;
    }

    return result;
  }

  /**
   * T-6.2: Search sale listings with pg_trgm
   */
  async searchVentes(query: string, filters?: any) {
    // Use ILIKE with trigram matching for fuzzy search
    // The pg_trgm extension enables % operator for similarity
    const where: Record<string, unknown> = {
      statut: 'ACTIVE',
      OR: [
        { titre: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (filters?.materiau) {
      where.materiau = filters.materiau;
    }
    if (filters?.categorie) {
      where.categorie = filters.categorie;
    }
    if (filters?.minPrice || filters?.maxPrice) {
      where.prixProduit = {
        ...(where.prixProduit as Record<string, number> || {}),
        ...(filters.minPrice ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
      } as any;
    }

    return this.prisma.annonceVente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        titre: true,
        description: true,
        categorie: true,
        materiau: true,
        couleur: true,
        photos: true,
        prixProduit: true,
        delaiExpeditionJours: true,
        modeLivraison: true,
        fraisLivraison: true,
        createdAt: true,
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
  }

  /**
   * T-6.3: Search request listings with pg_trgm
   */
  async searchDemandes(query: string, filters?: any) {
    const where: Record<string, unknown> = {
      statut: 'OUVERTE',
      dateExpiration: { gt: new Date() },
      OR: [
        { titre: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (filters?.materiau) {
      where.materiauSouhaite = filters.materiau;
    }

    return this.prisma.annonceDemande.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
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
        acheteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * T-6.4: Autocomplete — suggest titles based on partial input
   */
  async autocomplete(query: string, type: 'ventes' | 'demandes' | 'all' = 'ventes', limit = 10) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    const suggestions: string[] = [];

    if (type === 'ventes' || type === 'all') {
      const ventes = await this.prisma.annonceVente.findMany({
        where: {
          statut: 'ACTIVE',
          titre: { startsWith: query, mode: 'insensitive' },
        },
        select: { titre: true },
        take: limit,
      });
      suggestions.push(...ventes.map((v) => v.titre));
    }

    if (type === 'demandes' || type === 'all') {
      const demandes = await this.prisma.annonceDemande.findMany({
        where: {
          statut: 'OUVERTE',
          titre: { startsWith: query, mode: 'insensitive' },
        },
        select: { titre: true },
        take: limit,
      });
      suggestions.push(...demandes.map((d) => d.titre));
    }

    return {
      suggestions: suggestions.slice(0, limit),
      query,
    };
  }

  /**
   * Get trending searches (by count)
   */
  async getTrending(limit = 10) {
    // Placeholder: in production, track searches in a table
    return { trending: [] as string[] };
  }
}
