// ============================================================
// Enums
// ============================================================

export type TypeCompte = 'particulier' | 'pro';
export enum Materiau {
  PLA = 'PLA',
  PETG = 'PETG',
  ABS = 'ABS',
  ASA = 'ASA',
  TPU = 'TPU',
  RESINE = 'RESINE',
  AUTRE = 'AUTRE',
}
export type MateriauType = 'PLA' | 'PETG' | 'ABS' | 'ASA' | 'TPU' | 'RESINE' | 'AUTRE';
export type CategorieAnnonce =
  | 'DECORATION'
  | 'FIGURINES_JEU'
  | 'PIECES_TECHNIQUES'
  | 'BIJOUX_ACCESSOIRES'
  | 'MAISON_RANGEMENT'
  | 'EDUCATION_MAQUETTES'
  | 'SUR_MESURE_PERSONNALISE'
  | 'AUTRE';
export type ModeLivraison = 'ENVOI' | 'MAIN_PROPRE' | 'LES_DEUX';
export type TypeDisponibilite = 'PIECE_UNIQUE' | 'STOCK_LIMITE' | 'SUR_COMMANDE';
export type StatutAnnonceVente = 'ACTIVE' | 'EN_PAUSE' | 'VENDU' | 'ARCHIVE' | 'SUSPENDU';
export type StatutAnnonceDemande = 'OUVERTE' | 'DEVIS_EN_COURS' | 'CLOTUREE' | 'EXPIREE' | 'ANNULEE';
export type StatutDevis = 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE' | 'RETIRE';
export type SourceCommande = 'ANNONCE_VENTE' | 'DEVIS' | 'OFFRE_MESSAGERIE';
export type StatutCommande =
  | 'EN_ATTENTE_PAIEMENT'
  | 'PAYEE'
  | 'EXPEDIEE'
  | 'LIVREE'
  | 'LITIGE'
  | 'REMBOURSEE'
  | 'ANNULEE';
export type TypeAvis = 'ACHETEUR_VERS_VENDEUR' | 'VENDEUR_VERS_ACHETEUR';
export type ContexteType = 'ANNONCE_VENTE' | 'ANNONCE_DEMANDE';
export type MessageType = 'TEXTE' | 'OFFRE' | 'SYSTEME';
export type OffreAnnonceType = 'VENTE' | 'DEMANDE';
export type StatutOffre = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE' | 'EXPIREE';
export type CibleTypeSignalement =
  | 'ANNONCE_VENTE'
  | 'ANNONCE_DEMANDE'
  | 'UTILISATEUR'
  | 'MESSAGE'
  | 'CONVERSATION'
  | 'AVIS';
export type MotifSignalement =
  | 'ILLOCITE'
  | 'ARME'
  | 'CONTREFACON'
  | 'ARNAQUE'
  | 'HARCELEMENT'
  | 'SPAM'
  | 'CONTENU_INAPPROPRIE'
  | 'AUTRE';
export type StatutSignalement = 'OUVERT' | 'EN_COURS' | 'TRAITE' | 'REJETE';
export type MotifLitige = 'NON_RECU' | 'NON_CONFORME' | 'ENDOMMAGE' | 'AUTRE';
export type StatutLitige = 'OUVERT' | 'REPONSE_VENDEUR' | 'EN_ARBITRAGE' | 'CLOS';
export type DecisionLitige = 'REMBOURSE_TOTAL' | 'REMBOURSE_PARTIEL' | 'REJETE';
export type LivraisonSouhaitee = 'ENVOI' | 'MAIN_PROPRE' | 'INDIFFERENT';

// ============================================================
// Core entities
// ============================================================

export interface User {
  id: string;
  email: string;
  emailVerifieAt: string | null;
  nom: string;
  prenom: string;
  role: string;
  statut: string;
  typeCompte: TypeCompte;
  avatar: string | null;
  avatarUrl: string | null;
  localisation: JsonLocation | null;
  stripeCustomerId: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  noteMoyenne: number;
  nbAvis: number;
  siret: string | null;
  nomCommercial: string | null;
  actifVendeur: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JsonLocation {
  address?: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export interface AnnonceVente {
  id: string;
  vendeurId: string;
  vendeur: User;
  titre: string;
  description: string;
  categorie: CategorieAnnonce;
  materiau: MateriauType;
  couleur: string;
  photos: string[];
  prixProduit: number; // in centimes
  typeDisponibilite: TypeDisponibilite | null;
  stock: number | null;
  delaiExpeditionJours: number;
  modeLivraison: ModeLivraison;
  fraisLivraison: number; // in centimes
  poidsG: number | null;
  offresAutorisees: boolean;
  statut: StatutAnnonceVente;
  createdAt: string;
  updatedAt: string;
}

export interface AnnonceDemande {
  id: string;
  acheteurId: string;
  acheteur: User;
  titre: string;
  description: string | null;
  fichier3d: string | null;
  photosReference: string[];
  budgetMax: number | null;
  materiauSouhaite: MateriauType | null;
  couleurSouhaitee: string | null;
  quantite: number;
  livraisonSouhaitee: LivraisonSouhaitee | null;
  statut: StatutAnnonceDemande;
  dateExpiration: string;
  createdAt: string;
}

export interface Devis {
  id: string;
  demandeId: string;
  demande: AnnonceDemande;
  imprimeurId: string;
  imprimeur: User;
  prixProduit: number;
  fraisLivraison: number;
  delaiJours: number;
  materiauPropose: MateriauType;
  couleurProposee: string;
  message: string | null;
  validiteJusquA: string;
  statut: StatutDevis;
  createdAt: string;
}

export interface Commande {
  id: string;
  acheteurId: string;
  acheteur: User;
  vendeurId: string;
  vendeur: User;
  sourceType: SourceCommande;
  sourceId: string;
  quantite: number;
  modeLivraison: ModeLivraison;
  adresseLivraison: JsonLocation | null;
  montantProduit: number;
  fraisLivraison: number;
  commissionPct: number;
  commissionFixe: number;
  commissionTotale: number;
  montantTotalAcheteur: number;
  montantRembourse: number;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  statut: StatutCommande;
  motifAnnulation: string | null;
  trackingInfo: string | null;
  codeRemise: string | null;
  datePaiement: string | null;
  dateLimiteExpedition: string | null;
  dateExpedition: string | null;
  dateLivraisonConfirmee: string | null;
  dateLiberationPrevue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Avis {
  id: string;
  commandeId: string;
  auteurId: string;
  auteur: User;
  cibleId: string;
  cible: User;
  note: number; // 1-5
  commentaire: string | null;
  type: TypeAvis;
  publieAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  initiateurId: string;
  destinataireId: string;
  initiateur: User;
  destinataire: User;
  contexteType: ContexteType | null;
  contexteId: string | null;
  archivee: boolean;
  dernierLuAt: string | null;
  createdAt: string;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  expediteurId: string;
  expediteur: User;
  type: MessageType;
  contenu: string;
  offreId: string | null;
  offre: OffreMessagerie | null;
  piecesJointes: string[];
  createdAt: string;
}

export interface OffreMessagerie {
  id: string;
  conversationId: string;
  expediteurId: string;
  expediteur: User;
  destinataireId: string;
  annonceVenteId: string | null;
  montant: number;
  fraisLivraison: number;
  statut: StatutOffre;
  parentOffreId: string | null;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Litige {
  id: string;
  commandeId: string;
  commande: Commande;
  ouvertParId: string;
  ouvertPar: User;
  motif: MotifLitige;
  description: string;
  photos: string[];
  reponseVendeur: string | null;
  reponseAt: string | null;
  statut: StatutLitige;
  decision: DecisionLitige | null;
  montantRembourse: number | null;
  decideParId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImprimeurProfil {
  userId: string;
  bio: string | null;
  imprimantes: JsonImprimante[];
  materiaux: MateriauType[];
  zoneExpedition: string | null;
  delaiMoyenJours: number;
  tarifsIndicatifs: JsonTarif;
  actif: boolean;
  disponible: boolean;
  enPauseDepuis: string | null;
  pauseOrigine: string | null;
  derniereActiviteAt: string | null;
}

export interface JsonImprimante {
  marque: string;
  modele: string;
  dimensions_max: { x_mm: number; y_mm: number; z_mm: number };
}

export interface JsonTarif {
  base_gramme: number;
  overrides_categorie?: Record<string, number>;
}

// ============================================================
// DTOs (request body types)
// ============================================================

export interface SignupDto {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  typeCompte: TypeCompte;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateVenteDto {
  titre: string;
  description: string;
  categorie: CategorieAnnonce;
  materiau: MateriauType;
  couleur: string;
  prixProduit: number;
  typeDisponibilite?: TypeDisponibilite;
  stock?: number;
  delaiExpeditionJours?: number;
  modeLivraison: ModeLivraison;
  fraisLivraison: number;
  poidsG?: number;
  offresAutorisees?: boolean;
  photos?: string[];
}

export interface CreateDemandeDto {
  titre: string;
  description?: string;
  fichier3d?: string;
  photosReference?: string[];
  budgetMax?: number;
  materiauSouhaite?: MateriauType;
  couleurSouhaitee?: string;
  quantite?: number;
  livraisonSouhaitee?: LivraisonSouhaitee;
  dateExpiration: string;
}

export interface SubmitDevisDto {
  prixProduit: number;
  fraisLivraison: number;
  delaiJours: number;
  materiauPropose: MateriauType;
  couleurProposee: string;
  message?: string;
}

export interface CreateCommandeDto {
  sourceType: SourceCommande;
  sourceId: string;
  quantite?: number;
  modeLivraison: ModeLivraison;
  adresseLivraison?: JsonLocation;
}

export interface SendOfferDto {
  montant: number;
  fraisLivraison: number;
  annonceVenteId?: string;
  parentOffreId?: string;
  expireAt?: string;
}

export interface SendMsgDto {
  contenu: string;
  type?: MessageType;
  offreId?: string;
  piecesJointes?: string[];
}

// ============================================================
// Search & filters
// ============================================================

export interface SearchFilters {
  q?: string;
  type?: 'vente' | 'demande' | 'user' | 'all';
  materiau?: MateriauType | string;
  categorie?: CategorieAnnonce | string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  tri?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================
// Notifications
// ============================================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ============================================================
// Admin
// ============================================================

export interface AdminDashboard {
  totalUsers: number;
  totalListings: number;
  totalOrders: number;
  totalRevenue: number;
  pendingDisputes: number;
  pendingReports: number;
  recentOrders: Commande[];
  recentListings: (AnnonceVente | AnnonceDemande)[];
}

// ============================================================
// Auth response
// ============================================================

export interface AuthResponse {
  user: User;
  accessToken: string;
}
