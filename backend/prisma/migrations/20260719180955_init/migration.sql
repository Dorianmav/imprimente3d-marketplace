-- CreateEnum
CREATE TYPE "TypeCompte" AS ENUM ('particulier', 'pro');

-- CreateEnum
CREATE TYPE "Materiau" AS ENUM ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'RESINE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CategorieAnnonce" AS ENUM ('DECORATION', 'JOUET', 'MAQUETTE', 'PIECE_TECHNIQUE', 'COSPLAY', 'MINIATURE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ModeLivraison" AS ENUM ('ENVOI', 'MAIN_PROPRE', 'LES_DEUX');

-- CreateEnum
CREATE TYPE "StatutAnnonceVente" AS ENUM ('ACTIVE', 'VENDU', 'ARCHIVEE', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "StatutAnnonceDemande" AS ENUM ('OUVERTE', 'DEVIS_EN_COURS', 'CLOTUREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "SourceCommande" AS ENUM ('ANNONCE_VENTE', 'DEVIS', 'OFFRE_MESSAGERIE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE_PAIEMENT', 'PAYEE', 'EXPEDIEE', 'LIVREE', 'LITIGE', 'REMBOURSEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeAvis" AS ENUM ('ACHETEUR_VERS_VENDEUR', 'VENDEUR_VERS_ACHETEUR');

-- CreateEnum
CREATE TYPE "ConversationAnnonceType" AS ENUM ('ANNONCE_VENTE', 'ANNONCE_DEMANDE');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXTE', 'OFFRE', 'SYSTEME');

-- CreateEnum
CREATE TYPE "OffreAnnonceType" AS ENUM ('VENTE', 'DEMANDE');

-- CreateEnum
CREATE TYPE "StatutOffre" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE', 'EXPIREE');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('OUVERT', 'EN_COURS', 'TRAITE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "typeCompte" "TypeCompte" NOT NULL,
    "avatar" TEXT,
    "localisation" JSONB,
    "stripeCustomerId" TEXT,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "noteMoyenne" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nbAvis" INTEGER NOT NULL DEFAULT 0,
    "siret" TEXT,
    "numeroTva" TEXT,
    "nomCommercial" TEXT,
    "adresseFacturation" TEXT,
    "stripeBusinessType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprimeurProfil" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "imprimantes" JSONB NOT NULL,
    "materiaux" "Materiau"[],
    "localisation" JSONB NOT NULL,
    "zoneExpedition" TEXT,
    "delaiMoyenJours" INTEGER NOT NULL,
    "tarifsIndicatifs" JSONB NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ImprimeurProfil_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AnnonceVente" (
    "id" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" "CategorieAnnonce" NOT NULL,
    "materiau" "Materiau" NOT NULL,
    "couleur" TEXT NOT NULL,
    "photos" TEXT[],
    "prixProduit" INTEGER NOT NULL,
    "modeLivraison" "ModeLivraison" NOT NULL,
    "fraisLivraison" INTEGER NOT NULL,
    "stock" INTEGER,
    "statut" "StatutAnnonceVente" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnonceVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnonceDemande" (
    "id" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "fichier3d" TEXT,
    "photosReference" TEXT[],
    "budgetMax" INTEGER,
    "materiauSouhaite" "Materiau",
    "couleurSouhaitee" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "statut" "StatutAnnonceDemande" NOT NULL DEFAULT 'OUVERTE',
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnonceDemande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "imprimeurId" TEXT NOT NULL,
    "prixProduit" INTEGER NOT NULL,
    "fraisLivraison" INTEGER NOT NULL,
    "delaiJours" INTEGER NOT NULL,
    "materiauPropose" "Materiau" NOT NULL,
    "couleurProposee" TEXT NOT NULL,
    "message" TEXT,
    "statut" "StatutDevis" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "sourceType" "SourceCommande" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "montantProduit" INTEGER NOT NULL,
    "fraisLivraison" INTEGER NOT NULL,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "commissionFixe" INTEGER NOT NULL DEFAULT 80,
    "commissionTotale" INTEGER NOT NULL,
    "montantTotalAcheteur" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT',
    "trackingInfo" TEXT,
    "dateExpedition" TIMESTAMP(3),
    "dateLivraisonConfirmee" TIMESTAMP(3),
    "dateLiberationAuto" TIMESTAMP(3),
    "facturePdfKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "cibleId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "type" "TypeAvis" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "annonceType" "ConversationAnnonceType",
    "annonceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dernierLuAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "contenu" TEXT,
    "offreId" TEXT,
    "piecesJointes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffreMessagerie" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "annonceType" "OffreAnnonceType" NOT NULL,
    "annonceId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "fraisLivraison" INTEGER NOT NULL,
    "statut" "StatutOffre" NOT NULL DEFAULT 'EN_ATTENTE',
    "parentOffreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffreMessagerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalementMessagerie" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "motif" TEXT NOT NULL,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'OUVERT',
    "noteAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalementMessagerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_demandeId_imprimeurId_key" ON "Devis"("demandeId", "imprimeurId");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_commandeId_key" ON "Avis"("commandeId");

-- AddForeignKey
ALTER TABLE "ImprimeurProfil" ADD CONSTRAINT "ImprimeurProfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnonceVente" ADD CONSTRAINT "AnnonceVente_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnonceDemande" ADD CONSTRAINT "AnnonceDemande_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "AnnonceDemande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_imprimeurId_fkey" FOREIGN KEY ("imprimeurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_cibleId_fkey" FOREIGN KEY ("cibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "OffreMessagerie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreMessagerie" ADD CONSTRAINT "OffreMessagerie_parentOffreId_fkey" FOREIGN KEY ("parentOffreId") REFERENCES "OffreMessagerie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreMessagerie" ADD CONSTRAINT "OffreMessagerie_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreMessagerie" ADD CONSTRAINT "OffreMessagerie_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementMessagerie" ADD CONSTRAINT "SignalementMessagerie_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementMessagerie" ADD CONSTRAINT "SignalementMessagerie_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementMessagerie" ADD CONSTRAINT "SignalementMessagerie_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
