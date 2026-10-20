# Cahier des charges — Marketplace impression 3D
**Version 1.2 — consolidée**

---

## 1. Concept

Plateforme de mise en relation entre propriétaires d'imprimantes 3D (vendeurs) et acheteurs (particuliers ou professionnels) souhaitant des objets imprimés à la demande. Deux flux d'annonces coexistent : offre directe (vendeur propose un objet) et demande (acheteur publie un besoin, reçoit des devis). Messagerie intégrée avec système d'offres/contre-offres type Facebook Marketplace.

Modèle économique Vinted-like : gratuit à l'usage, commission prélevée uniquement sur transaction.

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Frontend web/mobile | Nuxt 3/4 + TailwindCSS |
| Packaging mobile | Capacitor (iOS + Android) |
| Backend | NestJS + TypeScript |
| Base de données | PostgreSQL |
| ORM | Prisma |
| File d'attente | BullMQ + Redis |
| Stockage fichiers | MinIO (photos annonces, pièces jointes messagerie) |
| Paiement | Stripe Connect (Destination Charges) |
| Auth | JWT + refresh token, OAuth Google/Apple |
| Notifications (orchestration multicanal) | Novu (self-hosted ou cloud) — workflows email/push/in-app, préférences utilisateur, composant Inbox |
| Emails transactionnels | Resend (provider branché derrière Novu) |
| Notifications push | Capacitor Push Notifications + Firebase FCM (provider branché derrière Novu) |
| Infra | Docker + Traefik + VPS OVH |
| CI/CD | GitHub Actions |

---

## 3. Acteurs

| Acteur | Description |
|---|---|
| Visiteur | Non inscrit, consultation publique des annonces |
| Utilisateur particulier | Inscrit, peut acheter, vendre, poster des demandes |
| Utilisateur pro | Inscrit avec SIRET, obligations légales supplémentaires |
| Imprimeur | Utilisateur (particulier ou pro) ayant activé le mode vendeur + Stripe Connect |
| Admin | Modération, litiges, tableau de bord |

Un même compte peut être à la fois acheteur et vendeur. Le mode "imprimeur" s'active en renseignant un profil vendeur et en complétant l'onboarding Stripe Connect (KYC obligatoire pour recevoir des fonds).

---

## 4. Comptes professionnels *(reporté en V2 — pas de compte pro en V1)*

> **V1 :** tous les comptes sont `particulier`. Le champ `type_compte` du modèle `users` et les champs SIRET/TVA/nom commercial/adresse facturation sont présents en base (migration anticipée) mais non exposés côté produit. Aucune vérification SIRENE, aucune facturation B2B, aucune obligation légale pro à gérer en V1.

Contenu ci-dessous conservé tel quel pour implémentation en V2.

### 4.1 Données collectées

Champs supplémentaires pour un compte pro, en sus des champs particulier :

| Champ | Obligatoire | Notes |
|---|---|---|
| SIRET | Oui | Validé format 14 chiffres + checksum Luhn. Vérification optionnelle via API SIRENE INSEE (gratuite) en V1 |
| Numéro TVA intracommunautaire | Non | Collecté, non vérifié en V1. Obligatoire si société assujettie |
| Nom commercial | Oui | Affiché sur les annonces et factures |
| Adresse de facturation | Oui | Utilisée pour génération des factures |
| `stripe_business_type` | Interne | `individual` (micro-entrepreneur) ou `company` — passé à Stripe Connect à la création du compte connecté |

Le code APE n'est pas collecté (donnée fiscale interne à l'entreprise, sans utilité plateforme).

### 4.2 Obligations légales

**Affichage sur les annonces :** toute annonce publiée par un vendeur pro doit afficher son nom commercial et SIRET (obligation loi 2019-1428, art. L.221-5-2 Code conso). Géré automatiquement via le profil.

**Facturation :** la plateforme génère automatiquement un PDF de facture conforme pour toute transaction B2B (vendeur pro ET acheteur pro). Pour les autres combinaisons (particulier↔particulier, particulier↔pro), un reçu suffit. La facture doit comporter : numéro unique séquentiel, date, SIRET vendeur + acheteur si pro, montant HT/TTC, TVA si applicable, numéro de commande plateforme.

**Droit de rétractation :** 14 jours pour un acheteur particulier. En B2B, le droit de rétractation légal ne s'applique pas (à préciser dans les CGU section pro).

**CGU :** une section pro dans les CGU existantes suffit (pas de document séparé).

### 4.3 Impact schéma

```sql
-- Ajouts sur la table users pour les comptes pro
siret              VARCHAR(14)  NULL  -- validé format INSEE
numero_tva         VARCHAR(20)  NULL
nom_commercial     VARCHAR(255) NULL
adresse_facturation JSONB       NULL  -- { rue, cp, ville, pays }
stripe_business_type VARCHAR(20) NULL -- 'individual' | 'company'
```

---

## 5. Modèle de données

### `users`
- id, email, password_hash, nom, prenom
- type_compte : particulier | pro
- avatar (MinIO key)
- localisation (JSONB — `{ ville, code_postal, lat, lng }`, requis pour vendeur, sert au tri/filtre par distance)
- stripe_customer_id
- stripe_account_id (Stripe Connect, null si non vendeur)
- stripe_onboarding_complete (bool)
- note_moyenne, nb_avis
- siret, numero_tva, nom_commercial, adresse_facturation, stripe_business_type *(pro uniquement)*
- created_at, updated_at

### `imprimeurs_profils` (V2)
- user_id (FK, unique)
- bio
- imprimantes (JSONB[] — `{ marque, modele, dimensions_max: { x_mm, y_mm, z_mm } }`, ex : Bambu Lab X1C, Prusa MK4, Creality K1)
- materiaux (text[] — parmi PLA, PETG, ABS, ASA, TPU, résine, autre)
- localisation (JSONB — `{ ville, code_postal, lat, lng }`, sert au filtre proximité)
- zone_expedition (text)
- delai_moyen_jours (int)
- tarifs_indicatifs (JSONB — `{ base_gramme: int(centimes), overrides_categorie: { categorie: prix_gramme_centimes } }`, purement informatif, le devis fait foi)
- disponible (bool, défaut true — bascule manuelle distincte de `actif` : `actif` = profil vendeur activé, `disponible` = accepte de nouvelles commandes actuellement)

### `annonces_vente`
- id, vendeur_id (FK)
- titre, description
- categorie (enum)
- materiau, couleur
- photos (MinIO keys[])
- prix_produit (int, centimes)
- mode_livraison : envoi | main_propre | les_deux (V1)
- frais_livraison (int, centimes — 0 si `main_propre` seul)
- stock (int, null = unique)
- statut : active | vendu | archivé | suspendu
- created_at, updated_at

### `annonces_demande`
- id, acheteur_id (FK)
- titre, description
- fichier_3d (MinIO key, nullable — STL/3MF, requis si pas de description seule)
- photos_reference (MinIO keys[])
- budget_max (int, centimes, optionnel)
- materiau_souhaite (enum : PLA | PETG | ABS | ASA | TPU | resine | autre, nullable)
- couleur_souhaitee (varchar, nullable)
- quantite (int, défaut 1)
- statut : ouverte | devis_en_cours | cloturée | annulée
- date_expiration (défaut : J+15)
- created_at

**Règle de saisie :** au moins un des deux (`fichier_3d` ou `description`) obligatoire. `materiau_souhaite` et `couleur_souhaitee` optionnels — l'imprimeur peut proposer une alternative dans son devis s'il n'a pas le matériau/couleur exacts.

**Inactivité imprimeur → mode vacances :** si un imprimeur ne répond à aucune demande/devis pendant 15 jours consécutifs, son profil bascule automatiquement `disponible = false` ("mode vacances") — ses annonces de vente passent en `suspendu` (masquées du feed) et il n'apparaît plus dans le feed des nouvelles demandes. Réactivation manuelle depuis le profil.

### `devis`
- id, demande_id (FK), imprimeur_id (FK)
- prix_produit (int, centimes)
- frais_livraison (int, centimes)
- delai_jours (int)
- materiau_propose (enum, peut différer de `materiau_souhaite` si indisponible)
- couleur_proposee (varchar, peut différer de `couleur_souhaitee`)
- message
- statut : en_attente | accepté | refusé | expiré
- created_at

### `commandes`
- id
- acheteur_id (FK), vendeur_id (FK)
- source_type : annonce_vente | devis | offre_messagerie
- source_id (FK polymorphique)
- montant_produit (int, centimes)
- frais_livraison (int, centimes)
- commission_pct : 3
- commission_fixe : 80 (centimes)
- commission_totale (int, centimes) — montant_produit × 0.03 + 80
- montant_total_acheteur (int) — montant_produit + frais_livraison + commission_totale
- stripe_payment_intent_id
- stripe_transfer_id
- statut : en_attente_paiement | payée | expédiée | livrée | litige | remboursée | annulée
- tracking_info (text, optionnel)
- date_expedition
- date_livraison_confirmée
- date_liberation_auto — J+7 après expédition, J+21 absolu après paiement
- facture_pdf_key (MinIO key, généré post-paiement si B2B)
- created_at, updated_at

### `avis`
- id, commande_id (FK, unique), auteur_id (FK), cible_id (FK)
- note (1–5), commentaire
- type : acheteur_vers_vendeur | vendeur_vers_acheteur
- created_at

---

## 6. Messagerie

### 6.1 Modèle de données

### `conversations`
- id
- annonce_type : annonce_vente | annonce_demande | null
- annonce_id
- created_at

### `conversation_participants`
- conversation_id (FK), user_id (FK)
- dernier_lu_at

### `messages`
- id, conversation_id (FK), expediteur_id (FK)
- type : texte | offre | systeme
- contenu (text, nullable si type = offre)
- offre_id (FK nullable → `offres_messagerie`)
- pieces_jointes (MinIO keys[], max 5 fichiers, types : image/jpeg, image/png, image/webp)
- created_at

### `offres_messagerie`
- id
- conversation_id (FK)
- expediteur_id (FK)
- annonce_type : vente | demande
- annonce_id
- montant (int, centimes — prix produit uniquement)
- frais_livraison (int, centimes, toujours repris de l'annonce source, non modifiable dans l'offre)
- statut : en_attente | acceptée | refusée | annulée | expirée
- parent_offre_id (FK nullable, self-ref → contre-offre)
- created_at

### `signalements_messagerie`
- id, reporter_id (FK)
- conversation_id (FK)
- message_id (FK, nullable — signalement global de conv ou message précis)
- motif (text)
- statut : ouvert | en_cours | traité
- note_admin (text, nullable)
- created_at, updated_at

### `user_blocks` *(schéma V2, table créée en V1 vide pour migration propre)*
- blocker_id (FK), blocked_id (FK)
- created_at
- PRIMARY KEY (blocker_id, blocked_id)

### 6.2 Règles métier messagerie

**Initiation :** bouton "Contacter" sur une fiche annonce. Crée la conversation avec `contexte_type` et `contexte_id` de l'annonce. Une seule conversation par paire (acheteur, vendeur) par annonce.

**Offre :** bouton "Faire une offre" dans la conversation. Génère un message de type `offre` contenant le montant proposé. L'offre porte uniquement sur le **prix produit** — les frais de livraison ne sont jamais inclus dans le montant négocié (non compressibles, fixés par le vendeur sur l'annonce). Une seule offre active à la fois par conversation (les offres précédentes passent en `annulée` automatiquement dès qu'une nouvelle est soumise).

**Contre-offre :** réponse à une offre `en_attente`. Crée une nouvelle `offre_messagerie` avec `parent_offre_id` pointant sur l'offre d'origine. L'offre parente passe en `annulée`. Pas de limite de tours de négociation.

**Acceptation d'une offre :** l'acheteur (ou le vendeur selon qui a initié) clique "Accepter". La conversation affiche un CTA "Finaliser l'achat" → redirige vers le checkout avec les montants de l'offre acceptée. La commande est créée avec `source_type = offre_messagerie`.

**Refus d'une offre :** passe le statut en `refusée`. La conversation continue, une nouvelle offre peut être soumise.

**Pièces jointes :** max 5 fichiers par message, formats image uniquement (jpeg/png/webp), taille max 10 Mo par fichier, stockage MinIO.

**Signalement dans la messagerie :** bouton "Signaler" accessible depuis les options de la conversation (V1). Signale la conversation ou un message spécifique. Remonte en tableau admin sous forme de ticket `signalements_messagerie`. L'utilisateur signalé n'est pas notifié.

**Blocage (V2) :** table `user_blocks` créée en V1 mais fonctionnalité désactivée. En V2 : bloquer un user empêche l'initiation de nouvelles conversations et masque ses annonces dans le feed de l'utilisateur bloquant. Les conversations existantes sont archivées côté bloquant.

### 6.3 États d'une offre (machine d'états)

```
en_attente → acceptée  (destinataire accepte)
en_attente → refusée   (destinataire refuse)
en_attente → annulée   (nouvelle offre soumise dans la même conv, ou expiration 48h)
en_attente → expirée   (timer 48h sans réponse)
acceptée   → [checkout déclenché]
```

---

## 7. Modèle financier

### Commission

| Élément | Valeur |
|---|---|
| Commission variable | 3% du prix produit |
| Commission fixe | 0,80 € |
| Base de calcul | Prix produit uniquement (hors frais de livraison) |
| Frais de livraison | Saisis par le vendeur, affichés en ligne séparée, non commissionnés |

**Exemple :** objet 25 €, livraison 4 € → commission = 25 × 0.03 + 0.80 = 1.55 € → total acheteur = 30.55 €

Les taux sont des variables d'environnement (`COMMISSION_PCT`, `COMMISSION_FIXED_CENTS`), non hardcodées.

### Stripe Connect

- **Modèle :** Destination Charges. Paiement capturé sur le compte Stripe plateforme, transfer au vendeur connecté avec `application_fee_amount` = commission_totale.
- **KYC :** onboarding Stripe hosted. `stripe_business_type` passé à la création du compte connecté (individual / company).
- **Séquestre :** capture immédiate à l'achat. Transfer déclenché par confirmation réception acheteur ou libération automatique.
- **Libération automatique :** J+7 après `date_expedition`, J+21 absolu après paiement (cas vendeur ne marquant jamais "expédié" → intervention admin requise avant libération).
- **Remboursements :** Stripe Refunds API depuis l'admin.
- **Facturation B2B :** PDF généré post-paiement via job BullMQ, stocké MinIO, lien envoyé par email.

---

## 8. Flux fonctionnels

### 8.1 Achat direct (annonce de vente)

```
Acheteur → Fiche annonce → Checkout
→ Paiement Stripe (capture immédiate)
→ Commande créée (statut: payée)
→ Vendeur notifié → Marque "expédié" + tracking optionnel
→ Acheteur notifié → Confirme réception OU timer J+7 auto
→ Fonds libérés (transfer Stripe, commission déduite)
→ Invitation avis (bidirectionnel)
```

### 8.2 Achat via demande → devis

```
Acheteur publie une demande
→ Visible dans le feed imprimeurs
→ Imprimeurs soumettent des devis
→ Acheteur accepte un devis → autres devis passent en "refusé"
→ Checkout → même flux que 8.1
```

### 8.3 Achat via négociation messagerie

```
Acheteur clique "Contacter" sur une annonce
→ Conversation créée avec contexte annonce
→ Échange de messages + pièces jointes
→ Acheteur (ou vendeur) soumet une offre
→ Tours de négociation (offre / contre-offre)
→ Offre acceptée → CTA "Finaliser l'achat"
→ Checkout avec montant offre acceptée → même flux que 8.1
```

---

## 9. Écrans (V1)

| Écran | Description |
|---|---|
| Home / Feed | Annonces vente + section demandes récentes |
| Recherche | Filtres : catégorie, matériau, prix min/max, zone/distance (km) vendeur, retrait main propre / envoi, disponibilité |
| Fiche annonce vente | Photos, prix, livraison, profil vendeur, CTA achat + CTA Contacter |
| Fiche demande | Détail, fichier 3D, matériau/couleur/quantité souhaités, liste devis (acheteur) ou formulaire devis (imprimeur) |
| Profil imprimeur | Bio, imprimantes + dimensions max, matériaux, localisation, délai moyen, prix indicatif, disponibilité, avis, annonces actives |
| Créer annonce | Sélecteur : Vente ou Demande → formulaire adapté (demande : upload STL/3MF ou description, matériau, couleur, quantité) |
| Checkout | Récapitulatif produit + livraison + commission + paiement Stripe |
| Mes commandes | Historique, suivi statut, actions contextuelles |
| Messagerie — liste | Conversations actives, badge non-lu |
| Messagerie — thread | Messages + pièces jointes + bouton "Faire une offre" + signalement |
| Mon profil | Édition, mode vendeur, onboarding Stripe, section pro si applicable |
| Notifications | Centre notif in-app |
| Admin — dashboard | Commandes, signalements messagerie, litiges, users, KPIs |

---

## 10. Notifications

| Événement | Canal |
|---|---|
| Nouveau devis reçu | Push + email |
| Devis accepté / refusé | Push + email |
| Commande payée (vendeur) | Push + email |
| Offre reçue dans messagerie | Push |
| Contre-offre reçue | Push |
| Offre expirée (48h) | Push |
| Nouveau message | Push |
| Confirmation réception attendue (J+5) | Push + email |
| Libération fonds imminente (J+6 auto) | Push |
| Avis reçu | Push |
| Signalement pris en charge (admin → reporter) | Email |

---

## 11. Catégories d'annonces (V1)

Décoration · Figurines & Jeux · Pièces techniques & fonctionnelles · Bijoux & Accessoires · Maison & Rangement · Éducation & Maquettes · Sur-mesure / Personnalisé · Autre

---

## 12. Modération

- Signalement annonce, message ou utilisateur (bouton dans la conv, sur fiche annonce, sur profil).
- Queue admin : tickets `signalements_messagerie` + `signalements` annonces/users.
- Actions admin : avertissement | suspension compte | suppression annonce | ban.
- Suspension annonce = statut `suspendu`, invisible feed, vendeur notifié email.
- Litige commande = admin peut forcer remboursement total/partiel via Stripe Refund API.

---

## 13. Contraintes non-fonctionnelles

- Offline partiel : consultation cache feed, actions nécessitent connexion.
- Cibles Capacitor : iOS 15+ / Android 10+.
- RGPD : données pro (SIRET, TVA) traitées selon art. 6.1.c (obligation légale). Stripe gère KYC vendeur. Politique confidentialité + CGU avec section pro obligatoires avant mise en production.
- Stripe Connect : vérifier éligibilité marketplace impression 3D selon conditions Stripe (pas de restriction connue).
- Commission : variables d'environnement `COMMISSION_PCT` et `COMMISSION_FIXED_CENTS`.
- Factures B2B : numérotation séquentielle annuelle (ex: `FAC-2025-000001`), archivage 10 ans (MinIO).
- Novu : plan Free suffisant en V1 (10 000 workflow runs/mois, tous canaux inclus, 20 workflows, 3 membres). Bascule Pro (30 $/mois, dès 30 000 runs/mois) si volume dépassé.

---

## 14. Points ouverts à trancher avant dev

### Résolus

1. **Offre messagerie — frais de livraison** : l'offre porte uniquement sur le prix produit ; frais de livraison toujours repris de l'annonce, non négociables.
2. **Retrait en main propre** : inclus en V1 (`mode_livraison`), localisation (ville/CP/lat/lng) ajoutée sur `users` pour tri par distance.
3. **Comptes pro / SIRET** : reportés en V2. Aucun compte pro en V1, aucune vérification SIRENE.
4. **Expiration des demandes** : J+15 fixe. Imprimeur inactif 15 jours → mode vacances automatique (annonces suspendues).
5. **Intégration transporteur** : confirmé V2 (Mondial Relay + Colissimo). Schéma `commandes` conçu pour absorber `tracking_carrier`, `tracking_url`, `label_pdf_key` sans migration.
6. **Format prix imprimeur** : forfait au gramme avec possibilité de surcharge par catégorie d'objet (`tarifs_indicatifs`), toujours indicatif — le devis fait foi.
7. **Filtre proximité** : rayon en km paramétrable par l'acheteur.
8. **STL/3MF côté demande** : upload brut sans vérification en V1. Parsing/validation dimensions en V2.

### Restants

1. **Libération fonds J+21 absolu** : si le vendeur n'a jamais marqué "expédié", la libération auto à J+21 doit-elle être bloquée en attente d'intervention admin, ou se déclencher automatiquement avec remboursement acheteur si litige ?
2. **Seuil mode vacances** : les 15 jours d'inactivité se comptent-ils par imprimeur (tous canaux confondus : messages + devis) ou uniquement sur les demandes de devis non traitées ?
