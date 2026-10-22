// Mirrors Prisma enums for use in controllers / DTOs

export const LitigeStatut = {
  OUVERT: 'OUVERT',
  REPONSE_VENDEUR: 'REPONSE_VENDEUR',
  EN_ARBITRAGE: 'EN_ARBITRAGE',
  CLOS: 'CLOS',
} as const;

export const LitigeDecision = {
  REMBOURSE_TOTAL: 'REMBOURSE_TOTAL',
  REMBOURSE_PARTIEL: 'REMBOURSE_PARTIEL',
  REJETE: 'REJETE',
} as const;

export const LitigeMotif = {
  NON_RECUS: 'NON_RECU',
  NON_CONFORME: 'NON_CONFORME',
  ENDOMMAGE: 'ENDOMMAGE',
  AUTRE: 'AUTRE',
} as const;
