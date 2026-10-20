// ============================================
// CDC v1.3 — Constants
// ============================================

/** Prix minimum en centimes d'euro (3,00 €) */
export const PRICE_MIN_CENTS = 300;

/** Commission variable en pourcentage (3 %) */
export const COMMISSION_PCT = 3;

/** Commission fixe en centimes d'euro (0,80 €) */
export const COMMISSION_FIXED_CENTS = 80;

/** Ratio minimum d'offre par rapport au prix affiché (50 %) */
export const OFFER_MIN_RATIO = 0.5;

/** TTL d'une offre en heures (48 h) */
export const OFFER_TTL_HOURS = 48;

/** TTL de paiement après acceptation d'une offre en heures (24 h) */
export const OFFER_PAYMENT_TTL_HOURS = 24;

/** TTL d'un devis en jours (7 j) */
export const DEVIS_TTL_DAYS = 7;

/** TTL de paiement après acceptation d'un devis en heures (48 h) */
export const DEVIS_PAYMENT_TTL_HOURS = 48;

/** TTL du checkout en minutes (30 min) */
export const CHECKOUT_TTL_MINUTES = 30;

/** TTL d'une demande en jours (15 j) */
export const DEMANDE_TTL_DAYS = 15;

/** Délai de grâce pour l'expédition en jours (3 j) */
export const SHIPPING_GRACE_DAYS = 3;

/** Délai maximum d'expédition en jours (21 j) */
export const MAX_SHIPPING_DAYS = 21;

/** Délai de libération après expédition en jours (7 j) */
export const RELEASE_DELAY_SHIPPED_DAYS = 7;

/** Délai de libération en main propre en jours (3 j) */
export const RELEASE_DELAY_HANDOVER_DAYS = 3;

/** Délai de réponse du vendeur pour un litige en heures (72 h) */
export const DISPUTE_SELLER_RESPONSE_HOURS = 72;

/** Jours d'inactivité avant mode vacances (15 j) */
export const VACATION_INACTIVITY_DAYS = 15;

/** Fenêtre de dépôt d'avis en jours (14 j) */
export const REVIEW_WINDOW_DAYS = 14;

/** Upload image maximum en Mo (10 Mo) */
export const MAX_UPLOAD_IMAGE_MB = 10;

/** Upload fichier 3D maximum en Mo (50 Mo) */
export const MAX_UPLOAD_3D_MB = 50;

/** Seuil d'alerte vendeur — nombre de ventes */
export const SELLER_ALERT_SALES = 20;

/** Seuil d'alerte vendeur — revenus en centimes (1 500 €) */
export const SELLER_ALERT_REVENUE_CENTS = 150000;

/** Photos maximum par annonce */
export const MAX_PHOTOS_PER_ANNOUNCEMENT = 10;

/** Pièces jointes maximum par message */
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

/** Code de remise en main propre — longueur */
export const CODE_REMISE_LENGTH = 6;

/** Délai de conservation des messages en mois (24 mois) */
export const MESSAGE_RETENTION_MONTHS = 24;

/** Délai de conservation des logs en mois (12 mois) */
export const LOG_RETENTION_MONTHS = 12;

/** Délai de conservation des comptes inactifs en années (3 ans) */
export const INACTIVE_ACCOUNT_YEARS = 3;

/** Délai de conservation des commandes en années (10 ans) */
export const ORDER_RETENTION_YEARS = 10;

/** Délai de conservation des données fiscales en années (10 ans) */
export const FISCAL_RETENTION_YEARS = 10;

/** TTL du jeton de réinitialisation de mot de passe en heures (1 h) */
export const PASSWORD_RESET_TOKEN_HOURS = 1;

/** Tentatives maximales de connexion avant verrouillage */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Durée de verrouillage en minutes (30 min) */
export const LOCKOUT_DURATION_MINUTES = 30;

/** Rate limit — tentatives de connexion par minute */
export const LOGIN_RATE_LIMIT = 6;

/** Offres maximales par heure par conversation */
export const MAX_OFFERS_PER_HOUR = 10;

/** Devis actifs maximum par demande */
export const MAX_ACTIVE_DEVIS_PER_DEMANDE = 20;

// ============================================
// CDC v1.3 — Commission calculation
// ============================================

/**
 * Calcule la commission selon le CDC §7.1 :
 * commission = round(montant_produit × COMMISSION_PCT / 100) + COMMISSION_FIXED_CENTS
 * Arrondi half-up au centime le plus proche.
 */
export function calculateCommission(montantProduitCents: number): number {
  const variable = Math.round(montantProduitCents * COMMISSION_PCT / 100);
  return variable + COMMISSION_FIXED_CENTS;
}

/**
 * Calcule le montant total acheteur :
 * total = montant_produit + frais_livraison + commission
 */
export function calculateTotalAcheteur(
  montantProduitCents: number,
  fraisLivraisonCents: number,
  commissionPct?: number,
  commissionFixeCents?: number,
): { commission: number; total: number } {
  const pct = commissionPct ?? COMMISSION_PCT;
  const fixe = commissionFixeCents ?? COMMISSION_FIXED_CENTS;
  const commission = Math.round(montantProduitCents * pct / 100) + fixe;
  const total = montantProduitCents + fraisLivraisonCents + commission;
  return { commission, total };
}

// ============================================
// CDC v1.3 — Categories (V1)
// ============================================

export const CATEGORIES_V1 = [
  'DECORATION',
  'FIGURINES_JEU',
  'PIECES_TECHNIQUES',
  'BIJOUX_ACCESSOIRES',
  'MAISON_RANGEMENT',
  'EDUCATION_MAQUETTES',
  'SUR_MESURE_PERSONNALISE',
  'AUTRE',
] as const;

export const MATECIAUX_V1 = [
  'PLA',
  'PETG',
  'ABS',
  'ASA',
  'TPU',
  'RESINE',
  'AUTRE',
] as const;
