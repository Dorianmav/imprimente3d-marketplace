-- CDC v1.3 Schema Migration
-- Adds missing models, fields, enums, and constraints per CDC v1.3 specification

-- ============================================
-- 1. CREATE NEW ENUMS
-- ============================================

-- Enums already exist from old schema:
-- TypeCompte, Materiau, CategorieAnnonce, ModeLivraison, StatutAnnonceVente,
-- StatutAnnonceDemande, StatutDevis, SourceCommande, StatutCommande, TypeAvis,
-- ConversationAnnonceType, MessageType, OffreAnnonceType, StatutOffre

CREATE TYPE "type_disponibilite_enum" AS ENUM ('PIECE_UNIQUE', 'STOCK_LIMITE', 'SUR_COMMANDE');
CREATE TYPE "contexte_type_enum" AS ENUM ('ANNONCE_VENTE', 'ANNONCE_DEMANDE');
CREATE TYPE "cible_type_signalement_enum" AS ENUM ('ANNONCE_VENTE', 'ANNONCE_DEMANDE', 'UTILISATEUR', 'MESSAGE', 'CONVERSATION', 'AVIS');
CREATE TYPE "motif_signalement_enum" AS ENUM ('ILLOCITE', 'ARME', 'CONTREFACON', 'ARNAQUE', 'HARCELEMENT', 'SPAM', 'CONTENU_INAPPROPRIE', 'AUTRE');
CREATE TYPE "statut_signalement_enum" AS ENUM ('OUVERT', 'EN_COURS', 'TRAITE', 'REJETE');
CREATE TYPE "motif_litige_enum" AS ENUM ('NON_RECU', 'NON_CONFORME', 'ENDOMMAGE', 'AUTRE');
CREATE TYPE "statut_litige_enum" AS ENUM ('OUVERT', 'REPONSE_VENDEUR', 'EN_ARBITRAGE', 'CLOS');
CREATE TYPE "decision_litige_enum" AS ENUM ('REMBOURSE_TOTAL', 'REMBOURSE_PARTIEL', 'REJETE');
CREATE TYPE "pause_origine_enum" AS ENUM ('AUTO', 'MANUELLE', 'STRIPE');
CREATE TYPE "livraison_souhaitee_enum" AS ENUM ('ENVOI', 'MAIN_PROPRE', 'INDIFFERENT');

-- ============================================
-- 2. ADD MISSING COLUMNS TO users
-- ============================================

ALTER TABLE "User" ADD COLUMN "email_verifie_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "User" ADD COLUMN "role" VARCHAR(50) NOT NULL DEFAULT 'user';
ALTER TABLE "User" ADD COLUMN "statut" VARCHAR(50) NOT NULL DEFAULT 'actif';
ALTER TABLE "User" ADD COLUMN "cgu_version_acceptee" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN "cgu_acceptee_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "User" ADD COLUMN "deleted_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "User" ADD COLUMN "geom" TEXT;

-- Change adresse_facturation from varchar to jsonb
-- First set existing values to valid JSON, then change type
UPDATE "User" SET "adresse_facturation" = '{}'::jsonb WHERE "adresse_facturation" IS NULL OR "adresse_facturation" = '' OR "adresse_facturation" !~ '^\s*{';
ALTER TABLE "User" ALTER COLUMN "adresse_facturation" TYPE jsonb USING "adresse_facturation"::jsonb;

-- Make password_hash nullable (for OAuth-only accounts)
ALTER TABLE "User" ALTER COLUMN "password_hash" DROP NOT NULL;

-- ============================================
-- 3. ADD MISSING COLUMNS TO imprimeurs_profils
-- ============================================

ALTER TABLE "imprimeurs_profils" ADD COLUMN "actif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "imprimeurs_profils" ADD COLUMN "en_pause_depuis" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "imprimeurs_profils" ADD COLUMN "pause_origine" "pause_origine_enum";
ALTER TABLE "imprimeurs_profils" ADD COLUMN "derniere_activite_at" TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 4. ADD MISSING COLUMNS TO annonces_vente
-- ============================================

ALTER TABLE "annonces_vente" ADD COLUMN "type_disponibilite" "type_disponibilite_enum";
ALTER TABLE "annonces_vente" ADD COLUMN "delai_expedition_jours" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "annonces_vente" ADD COLUMN "poids_g" INTEGER;
ALTER TABLE "annonces_vente" ADD COLUMN "offres_autorisees" BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 5. ADD MISSING COLUMNS TO annonces_demande
-- ============================================

ALTER TABLE "annonces_demande" ADD COLUMN "livraison_souhaitee" "livraison_souhaitee_enum";

-- ============================================
-- 6. ADD MISSING COLUMNS TO devis
-- ============================================

-- Add RETIRE value to StatutDevis enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RETIRE') THEN
    ALTER TYPE "StatutDevis" ADD VALUE 'RETIRE';
  END IF;
END $$;

ALTER TABLE "devis" ADD COLUMN IF NOT EXISTS "validite_jusqu_a" TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 7. ADD MISSING COLUMNS TO commandes
-- ============================================

ALTER TABLE "commandes" ADD COLUMN "quantite" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "commandes" ADD COLUMN "mode_livraison" "mode_livraison_enum";
ALTER TABLE "commandes" ADD COLUMN "adresse_livraison" jsonb;
ALTER TABLE "commandes" ADD COLUMN "montant_rembourse" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "commandes" ADD COLUMN "motif_annulation" VARCHAR(50);
ALTER TABLE "commandes" ADD COLUMN "code_remise" VARCHAR(6);
ALTER TABLE "commandes" ADD COLUMN "date_paiement" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "commandes" ADD COLUMN "date_limite_expedition" TIMESTAMP WITH TIME ZONE;
-- date_expedition and date_livraison_confirmee already exist (snake_case)

-- ============================================
-- 8. ADD MISSING COLUMNS TO avis
-- ============================================

-- Add publie_at
ALTER TABLE "avis" ADD COLUMN "publie_at" TIMESTAMP WITH TIME ZONE;

-- Change avis.commande_id from @unique to @@unique([commande_id, type])
-- First drop existing unique constraint on commande_id
ALTER TABLE "avis" DROP CONSTRAINT IF EXISTS "avis_commande_id_key";
-- Add compound unique constraint
ALTER TABLE "avis" ADD CONSTRAINT "avis_commande_type_key" UNIQUE ("commande_id", "type");

-- ============================================
-- 9. CLEAN UP OLD COLUMNS (imprimeurs_profils)
-- ============================================

-- Drop old localisation from imprimeurs_profils (moved to users.geom)
ALTER TABLE "imprimeurs_profils" DROP COLUMN IF EXISTS "localisation";

-- ============================================
-- 10. RESTRUCTURE conversations (add initiateur/destinataire, rename context)
-- ============================================

-- Add new columns
ALTER TABLE "conversations" ADD COLUMN "initiateur_id" TEXT;
ALTER TABLE "conversations" ADD COLUMN "destinataire_id" TEXT;
ALTER TABLE "conversations" ADD COLUMN "contexte_type" "contexte_type_enum";
ALTER TABLE "conversations" ADD COLUMN "contexte_id" TEXT;

-- Migrate old data: annonce_type → contexte_type, annonce_id → contexte_id
UPDATE "conversations" SET "contexte_type" = CASE "annonce_type"
  WHEN 'ANNONCE_VENTE' THEN 'ANNONCE_VENTE'::"contexte_type_enum"
  WHEN 'ANNONCE_DEMANDE' THEN 'ANNONCE_DEMANDE'::"contexte_type_enum"
  ELSE NULL
END, "contexte_id" = "annonce_id"
WHERE "contexte_type" IS NULL;

-- Drop old columns
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "annonce_type";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "annonce_id";

-- Add FK constraints for new fields
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_initiateur_id_fkey"
  FOREIGN KEY ("initiateur_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_destinataire_id_fkey"
  FOREIGN KEY ("destinataire_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 11. ADD archivee column to conversation_participants
-- ============================================

ALTER TABLE "conversation_participants" ADD COLUMN "archivee" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 12. ADD fields to messages
-- ============================================

ALTER TABLE "messages" ADD COLUMN "flags" TEXT[];

-- ============================================
-- 13. RESTRUCTURE offres_messagerie
-- ============================================

ALTER TABLE "offres_messagerie" ADD COLUMN "destinataire_id" TEXT;
ALTER TABLE "offres_messagerie" ADD COLUMN "expire_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "offres_messagerie" ADD COLUMN "annonce_vente_id" TEXT;
ALTER TABLE "offres_messagerie" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ============================================
-- 14. CREATE oauth_accounts table
-- ============================================

CREATE TABLE "oauth_accounts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("provider", "provider_user_id"),
  CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- ============================================
-- 15. CREATE refresh_tokens table
-- ============================================

CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "famille_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "revoked_at" TIMESTAMP WITH TIME ZONE,
  "user_agent" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_famille_id_idx" ON "refresh_tokens"("famille_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- ============================================
-- 16. CREATE vendeurs_fiscal table
-- ============================================

CREATE TABLE "vendeurs_fiscal" (
  "user_id" TEXT NOT NULL,
  "date_naissance" TIMESTAMP WITH TIME ZONE NOT NULL,
  "adresse_fiscale" jsonb NOT NULL,
  "nif" TEXT NOT NULL,
  "collecte_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id"),
  CONSTRAINT "vendeurs_fiscal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "vendeurs_fiscal_collecte_at_idx" ON "vendeurs_fiscal"("collecte_at");

-- ============================================
-- 17. CREATE litiges table
-- ============================================

CREATE TABLE "litiges" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "commande_id" TEXT NOT NULL UNIQUE,
  "ouvert_par_id" TEXT NOT NULL,
  "motif" "motif_litige_enum" NOT NULL,
  "description" TEXT NOT NULL,
  "photos" TEXT[] DEFAULT '{}',
  "reponse_vendeur" TEXT,
  "reponse_at" TIMESTAMP WITH TIME ZONE,
  "statut" "statut_litige_enum" NOT NULL DEFAULT 'OUVERT',
  "decision" "decision_litige_enum",
  "montant_rembourse" INTEGER,
  "decide_par_id" TEXT,
  "note_admin" TEXT,
  "closed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "litiges_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "litiges_ouvert_par_id_fkey" FOREIGN KEY ("ouvert_par_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "litiges_decide_par_id_fkey" FOREIGN KEY ("decide_par_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "litiges_commande_id_idx" ON "litiges"("commande_id");
CREATE INDEX "litiges_statut_idx" ON "litiges"("statut");
CREATE INDEX "litiges_ouvert_par_id_idx" ON "litiges"("ouvert_par_id");

-- ============================================
-- 18. CREATE signalements table (unified)
-- ============================================

CREATE TABLE "signalements" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id" TEXT NOT NULL,
  "cible_type" "cible_type_signalement_enum" NOT NULL,
  "cible_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "motif" "motif_signalement_enum" NOT NULL,
  "description" TEXT NOT NULL,
  "statut" "statut_signalement_enum" NOT NULL DEFAULT 'OUVERT',
  "decision" TEXT,
  "note_admin" TEXT,
  "traite_par_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "signalements_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "signalements_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "signalements_traite_par_id_fkey" FOREIGN KEY ("traite_par_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "signalements_statut_idx" ON "signalements"("statut");
CREATE INDEX "signalements_reporter_id_idx" ON "signalements"("reporter_id");
CREATE INDEX "signalements_cible_idx" ON "signalements"("cible_type", "cible_id");
CREATE INDEX "signalements_traite_par_id_idx" ON "signalements"("traite_par_id");

-- ============================================
-- 19. CREATE stripe_webhook_events table
-- ============================================

CREATE TABLE "stripe_webhook_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" jsonb NOT NULL,
  "recu_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "traite_at" TIMESTAMP WITH TIME ZONE,
  "erreur" TEXT,
  PRIMARY KEY ("id"),
  UNIQUE ("event_id")
);

CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");
CREATE INDEX "stripe_webhook_events_recu_at_idx" ON "stripe_webhook_events"("recu_at");

-- ============================================
-- 20. CREATE admin_audit_log table
-- ============================================

CREATE TABLE "admin_audit_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "acteur_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "cible_type" TEXT NOT NULL,
  "cible_id" TEXT,
  "details" jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "admin_audit_log_acteur_id_fkey" FOREIGN KEY ("acteur_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "admin_audit_log_acteur_id_idx" ON "admin_audit_log"("acteur_id");
CREATE INDEX "admin_audit_log_cible_idx" ON "admin_audit_log"("cible_type", "cible_id");
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- ============================================
-- 21. Migrate data from signalement_messagerie to signalements
-- ============================================

INSERT INTO "signalements" ("reporter_id", "cible_type", "cible_id", "conversation_id", "motif", "description", "statut", "decision", "note_admin", "traite_par_id", "created_at", "updated_at")
SELECT
  "reporter_id",
  'CONVERSATION'::"cible_type_signalement_enum" AS cible_type,
  "conversation_id" AS cible_id,
  "conversation_id",
  CASE "motif"
    WHEN 'illicite' THEN 'ILLOCITE'::"motif_signalement_enum"
    WHEN 'arme' THEN 'ARME'::"motif_signalement_enum"
    WHEN 'contrefacon' THEN 'CONTREFACON'::"motif_signalement_enum"
    WHEN 'arnaque' THEN 'ARNAQUE'::"motif_signalement_enum"
    WHEN 'harcelement' THEN 'HARCELEMENT'::"motif_signalement_enum"
    WHEN 'spam' THEN 'SPAM'::"motif_signalement_enum"
    WHEN 'contenu_inapproprie' THEN 'CONTENU_INAPPROPRIE'::"motif_signalement_enum"
    ELSE 'AUTRE'::"motif_signalement_enum"
  END,
  "motif",
  CASE "statut"
    WHEN 'ouvert' THEN 'OUVERT'::"statut_signalement_enum"
    WHEN 'en_cours' THEN 'EN_COURS'::"statut_signalement_enum"
    WHEN 'traite' THEN 'TRAITE'::"statut_signalement_enum"
    ELSE 'OUVERT'::"statut_signalement_enum"
  END,
  NULL AS decision,
  "note_admin",
  NULL AS traite_par_id,
  "created_at",
  "updated_at"
FROM "signalement_messagerie"
WHERE EXISTS (SELECT 1 FROM "User" WHERE "id" = "signalement_messagerie"."reporter_id");

-- ============================================
-- 22. Drop old SignalementMessagerie table
-- ============================================

DROP TABLE IF EXISTS "signalement_messagerie";

-- ============================================
-- 23. Create indexes for PostGIS (when extension enabled)
-- ============================================
-- Note: PostGIS extension must be enabled separately:
--   CREATE EXTENSION IF NOT EXISTS postgis;
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- And geom column needs GIST index:
--   CREATE INDEX IF NOT EXISTS "User_geom_idx" ON "User" USING GIST (geom::geography);

-- ============================================
-- 24. Add indexes for new/changed columns
-- ============================================

CREATE INDEX "User_statut_idx" ON "User"("statut");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_email_verifie_at_idx" ON "User"("email_verifie_at");
CREATE INDEX "imprimeurs_profils_actif_idx" ON "imprimeurs_profils"("actif");
CREATE INDEX "imprimeurs_profils_disponible_idx" ON "imprimeurs_profils"("disponible");
CREATE INDEX "annonces_vente_statut_idx" ON "annonces_vente"("statut");
CREATE INDEX "annonces_vente_type_disponibilite_idx" ON "annonces_vente"("type_disponibilite");
CREATE INDEX "annonces_vente_prix_idx" ON "annonces_vente"("prix_produit");
CREATE INDEX "devis_validite_jusqua_idx" ON "devis"("validite_jusqu_a");
CREATE INDEX "offres_messagerie_destinataire_id_idx" ON "offres_messagerie"("destinataire_id");
CREATE INDEX "offres_messagerie_expire_at_idx" ON "offres_messagerie"("expire_at");
CREATE INDEX "commandes_date_limite_expedition_idx" ON "commandes"("date_limite_expedition");
CREATE INDEX "commandes_stripe_payment_intent_id_idx" ON "commandes"("stripe_payment_intent_id");
