// ============================================
// CDC v1.3 — Shared Types
// ============================================

// ============================================
// Roles
// ============================================

export type UserRole = 'user' | 'moderateur' | 'admin';

// ============================================
// User Status
// ============================================

export type UserStatus = 'actif' | 'suspendu' | 'banni' | 'supprime';

// ============================================
// Account Type (V1: always 'particulier')
// ============================================

export type AccountType = 'particulier' | 'pro';

// ============================================
// User Profile
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  nom: string;
  prenom: string;
  role: UserRole;
  statut: UserStatus;
  typeCompte: AccountType;
  avatar: string | null;
  avatarUrl: string | null;
  localisation: { ville: string; code_postal: string } | null;
  stripeCustomerId: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  noteMoyenne: number;
  nbAvis: number;
  actifVendeur: boolean;
  cguVersionAcceptee: string | null;
  cguAccepteeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Imprimeur Profile
// ============================================

export interface ImprimanteSpec {
  marque: string;
  modele: string;
  dimensionsMax: { x_mm: number; y_mm: number; z_mm: number };
}

export interface ImprimeurProfilData {
  userId: string;
  bio: string | null;
  imprimantes: ImprimanteSpec[];
  materiaux: string[];
  zoneExpedition: string | null;
  delaiMoyenJours: number;
  tarifsIndicatifs: Record<string, number>;
  actif: boolean;
  disponible: boolean;
  enPauseDepuis: Date | null;
  pauseOrigine: 'auto' | 'manuelle' | 'stripe' | null;
  derniereActiviteAt: Date | null;
}

// ============================================
// Sale Listing
// ============================================

export type ListingStatus = 'active' | 'en_pause' | 'vendu' | 'archive' | 'suspendu';
export type ListingType = 'piece_unique' | 'stock_limite' | 'sur_commande';
export type DeliveryMode = 'envoi' | 'main_propre' | 'les_deux';
export type Category = 'DECORATION' | 'FIGURINES_JEU' | 'PIECES_TECHNIQUES' | 'BIJOUX_ACCESSOIRES' | 'MAISON_RANGEMENT' | 'EDUCATION_MAQUETTES' | 'SUR_MESURE_PERSONNALISE' | 'AUTRE';
export type Material = 'PLA' | 'PETG' | 'ABS' | 'ASA' | 'TPU' | 'RESINE' | 'AUTRE';

export interface SaleListing {
  id: string;
  vendeurId: string;
  titre: string;
  description: string;
  categorie: Category;
  materiau: Material;
  couleur: string;
  photos: string[];
  prixProduit: number;
  typeDisponibilite: ListingType;
  stock: number | null;
  delaiExpeditionJours: number;
  modeLivraison: DeliveryMode;
  fraisLivraison: number;
  poidsG: number | null;
  offresAutorisees: boolean;
  statut: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Request Listing
// ============================================

export type RequestStatus = 'ouverte' | 'devis_en_cours' | 'cloturee' | 'expiree' | 'annulee';
export type WantedDelivery = 'envoi' | 'main_propre' | 'indifferent';

export interface RequestListing {
  id: string;
  acheteurId: string;
  titre: string;
  description: string | null;
  fichier3d: string | null;
  photosReference: string[];
  budgetMax: number | null;
  materiauSouhaite: Material | null;
  couleurSouhaitee: string | null;
  quantite: number;
  livraisonSouhaitee: WantedDelivery | null;
  statut: RequestStatus;
  dateExpiration: Date;
  createdAt: Date;
}

// ============================================
// Quote (Devis)
// ============================================

export type QuoteStatus = 'en_attente' | 'accepte' | 'refuse' | 'expire' | 'retire';

export interface Quote {
  id: string;
  demandeId: string;
  imprimeurId: string;
  prixProduit: number;
  fraisLivraison: number;
  delaiJours: number;
  materiauPropose: Material;
  couleurProposee: string;
  message: string | null;
  validiteJusquA: Date;
  statut: QuoteStatus;
  createdAt: Date;
}

// ============================================
// Order (Commande)
// ============================================

export type OrderSource = 'annonce_vente' | 'devis' | 'offre_messagerie';
export type OrderStatus = 'en_attente_paiement' | 'payee' | 'expediee' | 'livree' | 'litige' | 'remboursee' | 'annulee';
export type CancellationReason = 'non_paiement' | 'non_expedition' | 'acheteur' | 'vendeur' | 'admin' | null;

export interface Order {
  id: string;
  acheteurId: string;
  vendeurId: string;
  sourceType: OrderSource;
  sourceId: string;
  quantite: number;
  modeLivraison: DeliveryMode;
  adresseLivraison: { nom: string; rue: string; cp: string; ville: string; pays: string } | null;
  montantProduit: number;
  fraisLivraison: number;
  commissionPct: number;
  commissionFixe: number;
  commissionTotale: number;
  montantTotalAcheteur: number;
  montantRembourse: number;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  statut: OrderStatus;
  motifAnnulation: CancellationReason;
  trackingInfo: string | null;
  codeRemise: string | null;
  datePaiement: Date | null;
  dateLimiteExpedition: Date | null;
  dateExpedition: Date | null;
  dateLivraisonConfirmee: Date | null;
  dateLiberationPrevue: Date | null;
  dateLiberationEffectiva: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Dispute (Litige)
// ============================================

export type DisputeReason = 'non_recu' | 'non_conforme' | 'endommage' | 'autre';
export type DisputeStatus = 'ouvert' | 'reponse_vendeur' | 'en_arbitrage' | 'clos';
export type DisputeDecision = 'rembourse_total' | 'rembourse_partiel' | 'rejete' | null;

export interface Dispute {
  id: string;
  commandeId: string;
  ouvertParId: string;
  motif: DisputeReason;
  description: string;
  photos: string[];
  reponseVendeur: string | null;
  reponseAt: Date | null;
  statut: DisputeStatus;
  decision: DisputeDecision;
  montantRembourse: number | null;
  decideParId: string | null;
  noteAdmin: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Review (Avis)
// ============================================

export type ReviewType = 'acheteur_vers_vendeur' | 'vendeur_vers_acheteur';

export interface Review {
  id: string;
  commandeId: string;
  auteurId: string;
  cibleId: string;
  note: number;
  commentaire: string | null;
  type: ReviewType;
  publieAt: Date | null;
  createdAt: Date;
}

// ============================================
// Conversation & Message
// ============================================

export type ConversationContext = 'annonce_vente' | 'annonce_demande' | null;
export type MessageType = 'texte' | 'offre' | 'systeme';

export interface Conversation {
  id: string;
  initiateurId: string;
  destinataireId: string;
  contexteType: ConversationContext;
  contexteId: string | null;
  createdAt: Date;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  dernierLuAt: Date | null;
  archivee: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  expediteurId: string;
  type: MessageType;
  contenu: string | null;
  offreId: string | null;
  piecesJointes: string[];
  flags: string[] | null;
  createdAt: Date;
}

// ============================================
// Offer (Offre Messagerie)
// ============================================

export type OfferStatus = 'en_attente' | 'acceptee' | 'refusee' | 'annulee' | 'expiree';

export interface MessagingOffer {
  id: string;
  conversationId: string;
  expediteurId: string;
  destinataireId: string;
  annonceVenteId: string | null;
  montant: number;
  fraisLivraison: number;
  statut: OfferStatus;
  parentOffreId: string | null;
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Report (Signalement)
// ============================================

export type ReportTargetType = 'annonce_vente' | 'annonce_demande' | 'utilisateur' | 'message' | 'conversation' | 'avis';
export type ReportReason = 'illicite' | 'arme' | 'contrefacon' | 'arnaque' | 'harcelement' | 'spam' | 'contenu_inapproprie' | 'autre';
export type ReportStatus = 'ouvert' | 'en_cours' | 'traite' | 'rejete';

export interface Report {
  id: string;
  reporterId: string;
  cibleType: ReportTargetType;
  cibleId: string;
  conversationId: string | null;
  motif: ReportReason;
  description: string;
  statut: ReportStatus;
  decision: string | null;
  noteAdmin: string | null;
  traiteParId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User Block
// ============================================

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

// ============================================
// Audit Log
// ============================================

export interface AuditLogEntry {
  id: string;
  acteurId: string;
  action: string;
  cibleType: string;
  cibleId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
