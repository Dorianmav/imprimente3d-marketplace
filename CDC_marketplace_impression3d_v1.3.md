# Cahier des charges — Marketplace impression 3D
**Version 1.3 — révision critique de la v1.2**

---

## 0. Journal des modifications (v1.2 → v1.3)

### Corrections

| # | Point | Correction |
|---|---|---|
| 1 | Séquestre Stripe | Les Destination Charges transfèrent les fonds au vendeur dès le paiement : incompatible avec une libération différée. Remplacé par Separate Charges and Transfers (§7.2). |
| 2 | Libération J+21 absolu | Libérer sans expédition revenait à payer un vendeur défaillant. Remplacé par annulation + remboursement automatiques (§7.3). |
| 3 | `avis.commande_id` unique | Empêchait l'avis bidirectionnel. Unicité portée sur `(commande_id, type)`. |
| 4 | `conversations` | `annonce_*` (modèle) vs `contexte_*` (règles) : harmonisé. |
| 5 | Offres sur demandes | Chevauchement avec les devis. Offres limitées aux annonces de vente. |
| 6 | Machine d'états des offres | L'expiration était listée à la fois dans `annulee` et `expiree` : corrigé. |
| 7 | `imprimeurs_profils` en V2 | Table utilisée par des écrans et règles V1 : passée en V1. |
| 8 | Statut `suspendu` | Partagé entre mode vacances et modération (réactivation ambiguë) : ajout de `en_pause`. |
| 9 | `stock` null = unique | Ambigu (pièce unique vs illimité) : remplacé par `type_disponibilite`. |
| 10 | Enums accentués | Incompatibles avec Prisma : valeurs en snake_case ASCII. |
| 11 | Comptes pro | Résidus V1 (SIRENE, facture B2B, CGU pro, RGPD pro, `facture_pdf_key`) reportés en V2. |
| 12 | Droit de rétractation | Non applicable en C2C ; exclusion des biens personnalisés précisée pour la V2. |
| 13 | Règle de saisie demande | Formulation contradictoire sur `fichier_3d`. |
| 14 | Tables manquantes | `signalements` (annonces/users) référencée sans définition ; litiges, adresse de livraison, jetons de refresh absents. |
| 15 | Blocage utilisateur en V2 | Exigence de fait des stores pour une app à contenu utilisateur : passé en V1. |

### Ajouts

Adresse de livraison et mode de livraison sur la commande ; flux de litige acheteur ; annulation automatique faute d'expédition ; réservation de stock au checkout ; délai d'expédition sur annonces et devis ; validité des devis ; double-aveugle sur les avis ; contenus interdits (armes, contrefaçon) ; conformité (RGPD, DAC7, DSA, médiation) ; sécurité (uploads, auth, webhooks) ; sauvegardes, observabilité, environnements ; CI/CD et Definition of Done ; table des paramètres configurables ; récapitulatif V1/V2.

### Décisions tranchées (à valider)

Les deux points ouverts de la v1.2 sont résolus (§17). Nouveaux points ouverts en §17.3.

---

## 1. Concept et périmètre

Plateforme de mise en relation entre propriétaires d'imprimantes 3D (vendeurs) et acheteurs (particuliers) souhaitant des objets imprimés à la demande. Deux flux d'annonces coexistent : offre directe (vendeur propose un objet) et demande (acheteur publie un besoin, reçoit des devis). Messagerie intégrée avec système d'offres/contre-offres type Facebook Marketplace (annonces de vente uniquement).

Modèle économique Vinted-like : gratuit à l'usage, commission prélevée uniquement sur transaction, payée par l'acheteur.

**Périmètre V1 :** France métropolitaine, euro uniquement, interface en français (chaînes externalisées pour i18n ultérieure), paiement par carte via Stripe.

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Frontend | Nuxt 4 + TailwindCSS. Web : SSR (SEO des fiches annonces). Mobile : build statique SPA (`ssr: false`) embarqué dans Capacitor. Code partagé, deux cibles de build |
| Packaging mobile | Capacitor (iOS + Android) |
| Temps réel | Socket.io (Gateway NestJS) + adaptateur Redis. Authentification JWT au handshake |
| Backend | NestJS + TypeScript |
| Base de données | PostgreSQL + extensions PostGIS (distance) et pg_trgm (recherche tolérante aux fautes) |
| ORM | Prisma (requêtes géographiques en SQL brut, type `Unsupported`) |
| File d'attente | BullMQ + Redis |
| Stockage fichiers | MinIO via SDK S3-compatible (abstraction permettant une migration vers un stockage objet managé) |
| Paiement | Stripe Connect Express — Separate Charges and Transfers |
| Auth | JWT + refresh token rotatif, OAuth Google/Apple |
| Notifications (orchestration multicanal) | Novu Cloud en V1 (self-hosted écarté : empreinte infra élevée sur un VPS unique) |
| Emails transactionnels | Resend (provider branché derrière Novu) |
| Notifications push | Capacitor Push Notifications + Firebase FCM (provider branché derrière Novu) |
| Antivirus uploads | ClamAV (conteneur dédié) |
| Observabilité | Sentry (front + back), logs structurés (pino), supervision d'uptime |
| Infra | Docker + Traefik + VPS OVH |
| CI/CD | GitHub Actions (§13.5) |

Messagerie temps réel : Socket.io. Novu ne porte que les notifications hors session (push, email) et le centre de notifications in-app, pas le transport des messages.

---

## 3. Acteurs

| Acteur | Description |
|---|---|
| Visiteur | Non inscrit, consultation publique des annonces de vente et des demandes (le fichier 3D d'une demande n'est jamais public) |
| Utilisateur particulier | Inscrit, email vérifié, peut acheter, vendre, poster des demandes |
| Utilisateur pro | **V2** — inscrit avec SIRET, obligations légales supplémentaires |
| Imprimeur | Utilisateur ayant activé le mode vendeur : profil imprimeur renseigné + onboarding Stripe Connect complété |
| Modérateur | Traite les signalements, suspend annonces et comptes |
| Admin | Droits modérateur + litiges, remboursements, tableau de bord, journal d'audit |

Un même compte peut être à la fois acheteur et vendeur. Le mode imprimeur s'active en renseignant le profil imprimeur et en complétant l'onboarding Stripe (KYC obligatoire pour recevoir des fonds). Si les capacités du compte Stripe sont restreintes (webhook `account.updated`), les annonces de l'imprimeur passent en `en_pause` (origine `stripe`) jusqu'à régularisation.

---

## 4. Comptes professionnels *(reportés en V2 — pas de compte pro en V1)*

> **V1 :** tous les comptes sont `particulier`. Le champ `type_compte` et les champs pro (SIRET, TVA, nom commercial, adresse de facturation, `stripe_business_type`) sont présents en base (migration anticipée) mais non exposés. Aucune vérification SIRENE, aucune facturation B2B, aucune section pro dans les CGU, aucun traitement RGPD spécifique pro en V1.
>
> **Garde-fou V1 :** un vendeur « particulier » dont l'activité devient habituelle relève en pratique d'un statut professionnel. Voir le seuil d'alerte en §14.3.

Contenu ci-dessous conservé pour implémentation en V2.

### 4.1 Données collectées

| Champ | Obligatoire | Notes |
|---|---|---|
| SIRET | Oui | Format 14 chiffres + checksum Luhn. Vérification via API SIRENE INSEE (gratuite) en V2 |
| Numéro TVA intracommunautaire | Non | Collecté, non vérifié. Obligatoire si société assujettie |
| Nom commercial | Oui | Affiché sur les annonces et factures |
| Adresse de facturation | Oui | Utilisée pour la génération des factures |
| `stripe_business_type` | Interne | `individual` (micro-entrepreneur) ou `company`, passé à Stripe Connect à la création du compte connecté |

Le code APE n'est pas collecté.

### 4.2 Obligations légales (V2)

**Affichage sur les annonces :** toute annonce d'un vendeur pro affiche son nom commercial et son SIRET. Géré via le profil.

**Facturation :** PDF de facture conforme généré pour toute transaction B2B (vendeur pro ET acheteur pro) ; un reçu suffit dans les autres cas. Contenu : numéro séquentiel unique, date, SIRET vendeur et acheteur si pro, montants HT/TTC, TVA si applicable, numéro de commande. Numérotation annuelle (`FAC-2027-000001`), archivage 10 ans. Job BullMQ post-paiement, stockage MinIO, lien par email.

**Droit de rétractation :** non applicable entre particuliers (C2C). Vendeur pro vers acheteur particulier : 14 jours, **sauf** biens confectionnés selon les spécifications du consommateur ou nettement personnalisés (art. L221-28 3° Code de la consommation), cas fréquent en impression à la demande. À reprendre dans les CGU pro. En B2B, aucun droit de rétractation légal.

**CGU :** section pro ajoutée aux CGU existantes.

### 4.3 Impact schéma

```sql
-- Colonnes users réservées au compte pro (créées en V1, non exposées)
siret                VARCHAR(14)  NULL
numero_tva           VARCHAR(20)  NULL
nom_commercial       VARCHAR(255) NULL
adresse_facturation  JSONB        NULL  -- { rue, cp, ville, pays }
stripe_business_type VARCHAR(20)  NULL  -- 'individual' | 'company'
-- commandes.facture_pdf_key (MinIO key) ajouté en V2
```

---

## 5. Modèle de données

**Conventions :** montants en entiers (centimes d'euro) ; valeurs d'enum en snake_case ASCII sans accent (contrainte Prisma) ; horodatages UTC ; suppression de compte par anonymisation (§14.2).

**Enum `materiau` :** PLA | PETG | ABS | ASA | TPU | RESINE | AUTRE.

### `users`
- id, email, email_verifie_at, password_hash (null si OAuth seul), nom, prenom
- role : user | moderateur | admin
- statut : actif | suspendu | banni | supprime
- type_compte : particulier | pro (V2 ; toujours `particulier` en V1)
- avatar (MinIO key)
- localisation (JSONB — `{ ville, code_postal }`) + `geom` (`geography(Point,4326)`, index GIST). Requise pour vendeur. Les coordonnées exactes ne sont jamais exposées par l'API : distance arrondie, position publique approximée (ville)
- stripe_customer_id
- stripe_account_id (null si non vendeur)
- stripe_onboarding_complete (bool)
- note_moyenne, nb_avis (dénormalisés, recalculés par job à chaque publication d'avis)
- cgu_version_acceptee, cgu_acceptee_at
- siret, numero_tva, nom_commercial, adresse_facturation, stripe_business_type *(V2)*
- created_at, updated_at, deleted_at

### `oauth_accounts`
- id, user_id (FK), provider (google | apple), provider_user_id — unique `(provider, provider_user_id)`

### `refresh_tokens`
- id, user_id (FK), token_hash, famille_id (détection de réutilisation), expires_at, revoked_at, user_agent, created_at

### `vendeurs_fiscal`
- user_id (FK, unique), date_naissance, adresse_fiscale (JSONB), nif (chiffré applicativement), collecte_at
- Collecte déclenchée à l'activation du mode vendeur ou au franchissement des seuils (§14.3). Accès restreint (admin uniquement, journalisé)

### `imprimeurs_profils` (V1)
- user_id (FK, unique)
- bio
- imprimantes (JSONB[] — `{ marque, modele, dimensions_max: { x_mm, y_mm, z_mm } }`)
- materiaux (enum `materiau`[])
- zone_expedition (text — V1 : France métropolitaine)
- delai_moyen_jours (int)
- tarifs_indicatifs (JSONB — `{ base_gramme: int(centimes), overrides_categorie: { categorie: prix_gramme_centimes } }`, purement informatif, le devis fait foi)
- actif (bool — profil vendeur activé)
- disponible (bool, défaut true — accepte de nouvelles commandes ; distinct de `actif`)
- en_pause_depuis (timestamp, nullable), pause_origine : auto | manuelle | stripe (nullable)
- derniere_activite_at (voir règle d'inactivité ci-dessous)

### `annonces_vente`
- id, vendeur_id (FK)
- titre, description
- categorie (enum §11)
- materiau (enum), couleur
- photos (MinIO keys[], 1 à 10)
- prix_produit (int, centimes, ≥ `PRICE_MIN_CENTS`)
- type_disponibilite : piece_unique | stock_limite | sur_commande
- stock (int — requis si `stock_limite`, 1 si `piece_unique`, null si `sur_commande`)
- delai_expedition_jours (int ≥ 0 — fabrication + préparation)
- mode_livraison : envoi | main_propre | les_deux
- frais_livraison (int, centimes — 0 si `main_propre` seul)
- poids_g (int, nullable — préparé pour l'intégration transporteurs V2)
- offres_autorisees (bool, défaut true)
- statut : active | en_pause | vendu | archive | suspendu
  - `en_pause` : mode vacances ou restriction Stripe (réversible par le vendeur)
  - `suspendu` : décision de modération (réversible uniquement par modérateur/admin)
- created_at, updated_at

### `annonces_demande`
- id, acheteur_id (FK)
- titre, description
- fichier_3d (MinIO key, nullable — STL/3MF)
- photos_reference (MinIO keys[])
- budget_max (int, centimes, optionnel)
- materiau_souhaite (enum `materiau`, nullable)
- couleur_souhaitee (varchar, nullable)
- quantite (int, défaut 1)
- livraison_souhaitee : envoi | main_propre | indifferent
- statut : ouverte | devis_en_cours | cloturee | expiree | annulee
- date_expiration (défaut J+15)
- created_at

**Règle de saisie :** au moins un des deux entre `fichier_3d` et `description` est obligatoire. `materiau_souhaite` et `couleur_souhaitee` sont optionnels : l'imprimeur peut proposer une alternative.

**Cycle de vie :** `ouverte` → `devis_en_cours` dès le premier devis → `cloturee` au paiement d'une commande issue d'un devis → `expiree` à `date_expiration` sans clôture → `annulee` par l'acheteur. Prolongeable une fois de 15 jours. L'expiration est suspendue tant qu'une commande liée est `en_attente_paiement`. Maximum 20 devis actifs par demande.

**Mode vacances imprimeur (règle d'inactivité) :** l'imprimeur bascule automatiquement en pause (`disponible = false`, `pause_origine = auto`) après `VACATION_INACTIVITY_DAYS` (15) jours sans **activité**. Sont comptés comme activité : message envoyé, devis soumis, mise à jour d'une commande, création ou édition d'annonce, bascule manuelle de disponibilité. Une simple connexion ou lecture ne compte pas. Effets : annonces `active` → `en_pause`, absence du feed des nouvelles demandes. Les commandes en cours (`payee`, `expediee`) se poursuivent normalement. Notification à J+12. Réactivation manuelle depuis le profil : seules les annonces `en_pause` repassent `active`, jamais les `suspendu`.

### `devis`
- id, demande_id (FK), imprimeur_id (FK)
- prix_produit (int, centimes — prix total pour la `quantite` demandée, ≥ `PRICE_MIN_CENTS`)
- frais_livraison (int, centimes)
- mode_livraison : envoi | main_propre
- delai_jours (int — délai avant expédition ou remise)
- materiau_propose (enum), couleur_proposee (varchar) — peuvent différer du souhaité
- message
- validite_jusqu_a (défaut création + `DEVIS_TTL_DAYS`)
- statut : en_attente | accepte | refuse | expire | retire
- created_at
- Unicité : un seul devis `en_attente` ou `accepte` par couple `(demande_id, imprimeur_id)` ; modifier = retirer et resoumettre

**Acceptation d'un devis :** le devis passe `accepte`, l'acheteur dispose de `DEVIS_PAYMENT_TTL_HOURS` (48 h) pour payer. Sans paiement : le devis repasse `en_attente` (si encore valide). Les autres devis passent `refuse` uniquement au paiement réussi.

### `commandes`
- id
- acheteur_id (FK), vendeur_id (FK)
- source_type : annonce_vente | devis | offre_messagerie
- source_id (polymorphique — intégrité vérifiée par le service ; une seule commande non annulée par source)
- quantite (int, défaut 1)
- mode_livraison : envoi | main_propre (choisi au checkout si l'annonce propose `les_deux`)
- adresse_livraison (JSONB snapshot `{ nom, rue, cp, ville, pays }`, null si `main_propre`)
- montant_produit (int, centimes), frais_livraison (int, centimes — 0 si `main_propre`)
- commission_pct (snapshot, 3), commission_fixe (snapshot, 80)
- commission_totale (int) — voir §7.1
- montant_total_acheteur (int) — montant_produit + frais_livraison + commission_totale
- montant_rembourse (int, défaut 0)
- stripe_payment_intent_id, stripe_transfer_id
- statut : en_attente_paiement | payee | expediee | livree | litige | remboursee | annulee
- motif_annulation : non_paiement | non_expedition | acheteur | vendeur | admin (nullable)
- tracking_info (text, optionnel), code_remise (6 chiffres, `main_propre` uniquement)
- date_paiement, date_limite_expedition, date_expedition, date_livraison_confirmee
- date_liberation_prevue, date_liberation_effective
- created_at, updated_at
- Réservé V2 : tracking_carrier, tracking_url, label_pdf_key, facture_pdf_key

**Transitions :**

| De | Vers | Déclencheur |
|---|---|---|
| en_attente_paiement | payee | webhook `payment_intent.succeeded` |
| en_attente_paiement | annulee | expiration `CHECKOUT_TTL_MINUTES` ou échec définitif |
| payee | expediee | vendeur marque « expédié » (ou « remis en main propre ») |
| payee | annulee | annulation vendeur, non-expédition automatique (§7.3), décision admin — remboursement intégral |
| payee, expediee | litige | acheteur ouvre un litige (§8.4) |
| expediee | livree | confirmation acheteur ou libération automatique |
| litige | remboursee | décision : remboursement total |
| litige | livree | décision : rejet ou remboursement partiel (le solde est libéré) |

`livree` déclenche le transfert au vendeur ; `date_liberation_effective` est renseignée à la réussite du transfert (relance par job en cas d'échec, alerte admin).

### `litiges`
- id, commande_id (FK), ouvert_par_id (FK)
- motif : non_recu | non_conforme | endommage | autre
- description, photos (MinIO keys[], obligatoires sauf `non_recu`)
- reponse_vendeur (text, nullable), reponse_at
- statut : ouvert | reponse_vendeur | en_arbitrage | clos
- decision : rembourse_total | rembourse_partiel | rejete (nullable)
- montant_rembourse (int, nullable), decide_par_id (FK admin), note_admin
- created_at, closed_at
- Un seul litige ouvert par commande

### `avis`
- id, commande_id (FK), auteur_id (FK), cible_id (FK)
- note (1–5), commentaire (500 caractères max)
- type : acheteur_vers_vendeur | vendeur_vers_acheteur
- publie_at (null tant que non publié)
- created_at
- Unicité `(commande_id, type)`

**Règles :** avis possible uniquement sur commande `livree` sans remboursement total, dans les `REVIEW_WINDOW_DAYS` (14) jours. Publication en double-aveugle : les deux avis deviennent visibles quand les deux parties ont publié, ou à l'expiration de la fenêtre. Non modifiable après dépôt. Signalable.

### `signalements`
Remplace `signalements_messagerie` (table unifiée).
- id, reporter_id (FK)
- cible_type : annonce_vente | annonce_demande | utilisateur | message | conversation | avis
- cible_id
- conversation_id (FK, nullable — contexte)
- motif : illicite | arme | contrefacon | arnaque | harcelement | spam | contenu_inapproprie | autre
- description (text, 1000 caractères max)
- statut : ouvert | en_cours | traite | rejete
- decision (text, nullable), note_admin (text, nullable), traite_par_id (FK, nullable)
- created_at, updated_at

### `user_blocks` (V1)
- blocker_id (FK), blocked_id (FK), created_at
- PRIMARY KEY (blocker_id, blocked_id)

### `stripe_webhook_events`
- event_id (PK, unique), type, payload (JSONB), recu_at, traite_at, erreur (nullable) — déduplication et rejeu

### `admin_audit_log`
- id, acteur_id (FK), action, cible_type, cible_id, details (JSONB), created_at — append-only

---

## 6. Messagerie

### 6.1 Modèle de données

### `conversations`
- id
- initiateur_id (FK), destinataire_id (FK)
- contexte_type : annonce_vente | annonce_demande | null
- contexte_id
- created_at
- Unicité `(contexte_type, contexte_id, initiateur_id)` : une seule conversation par couple (initiateur, annonce)

### `conversation_participants`
- conversation_id (FK), user_id (FK)
- dernier_lu_at, archivee (bool)

### `messages`
- id, conversation_id (FK), expediteur_id (FK)
- type : texte | offre | systeme
- contenu (text, nullable si type = offre)
- offre_id (FK nullable → `offres_messagerie`)
- pieces_jointes (MinIO keys[], max 5, image/jpeg, image/png, image/webp)
- flags (text[], nullable — ex. `contournement_suspecte`)
- created_at

### `offres_messagerie`
- id
- conversation_id (FK)
- expediteur_id (FK), destinataire_id (FK)
- annonce_vente_id (FK)
- montant (int, centimes — prix produit unitaire uniquement)
- frais_livraison (int, centimes — repris de l'annonce selon le mode, non modifiable)
- statut : en_attente | acceptee | refusee | annulee | expiree
- parent_offre_id (FK nullable, self-ref → contre-offre)
- expire_at (création + `OFFER_TTL_HOURS`)
- created_at

### `user_blocks` : voir §5.

### 6.2 Règles métier messagerie

**Initiation :** bouton « Contacter » sur une fiche annonce (vente ou demande). Crée la conversation avec `contexte_type` et `contexte_id`. Impossible si l'un des deux utilisateurs a bloqué l'autre.

**Temps réel :** message persisté puis émis via Socket.io ; push Novu si le destinataire n'a pas de socket active. Lecture suivie par `dernier_lu_at`.

**Offre (annonces de vente uniquement) :** bouton « Faire une offre » si `offres_autorisees`. L'offre porte sur le **prix produit unitaire** (quantité 1 en V1) ; les frais de livraison restent ceux de l'annonce. Montant minimum : `OFFER_MIN_RATIO` (50 %) du prix affiché et ≥ `PRICE_MIN_CENTS`. Une seule offre active à la fois par conversation (la précédente passe `annulee`). Limite technique : 10 offres par heure et par conversation. Sur une `annonce_demande`, la tarification passe exclusivement par les devis.

**Contre-offre :** réponse à une offre `en_attente`. Nouvelle `offre_messagerie` avec `parent_offre_id` ; l'offre parente passe `annulee`. Pas de limite métier de tours.

**Acceptation :** le destinataire de l'offre clique « Accepter ». L'acheteur (qu'il ait émis ou reçu l'offre) obtient le CTA « Finaliser l'achat » et dispose de `OFFER_PAYMENT_TTL_HOURS` (24 h) pour payer ; l'annonce est réservée pendant ce délai. Sans paiement : l'offre passe `annulee`, l'annonce redevient disponible. La commande est créée avec `source_type = offre_messagerie`.

**Refus :** statut `refusee`, la conversation continue, une nouvelle offre peut être soumise.

**Pièces jointes :** max 5 par message, formats jpeg/png/webp, 10 Mo max par fichier, stockage MinIO privé, accès par URL présignée réservée aux participants. Contrôles de sécurité en §15.2.

**Anti-contournement :** détection (email, téléphone, IBAN, liens de paiement externes) dans les messages texte. V1 : avertissement affiché à l'expéditeur + `flags` pour la modération, sans blocage.

**Signalement :** bouton « Signaler » depuis la conversation ou un message. Crée un ticket `signalements`. L'utilisateur signalé n'est pas notifié.

**Blocage (V1) :** bloquer un utilisateur empêche toute nouvelle conversation, masque ses annonces et demandes dans le feed du bloquant, archive les conversations existantes côté bloquant. Liste des utilisateurs bloqués consultable et modifiable dans les paramètres.

### 6.3 États d'une offre

```
en_attente → acceptee  (destinataire accepte)
en_attente → refusee   (destinataire refuse)
en_attente → annulee   (remplacée par une contre-offre ou une nouvelle offre ; retirée par l'émetteur)
en_attente → expiree   (OFFER_TTL_HOURS sans réponse)
acceptee   → [checkout]
acceptee   → annulee   (OFFER_PAYMENT_TTL_HOURS sans paiement)
```

---

## 7. Modèle financier

### 7.1 Commission

| Élément | Valeur |
|---|---|
| Commission variable | 3 % du prix produit |
| Commission fixe | 0,80 € |
| Payeur | Acheteur (ajoutée au total) |
| Base de calcul | Prix produit uniquement (hors frais de livraison) |
| Frais de livraison | Fixés par le vendeur, ligne séparée, non commissionnés |
| Arrondi | `round(montant_produit × pct / 100)` à l'entier de centime le plus proche (half-up), puis + fixe |
| Prix plancher | `PRICE_MIN_CENTS` = 300 (3,00 €) pour toute annonce, devis et offre |

**Exemple :** objet 25 €, livraison 4 € → commission = 25 × 0,03 + 0,80 = 1,55 € → total acheteur = 30,55 € ; le vendeur reçoit 29,00 €.

Les taux sont des variables d'environnement, non hardcodées. Le vendeur ne supporte aucun frais.

**Marge :** en Separate Charges and Transfers, la plateforme supporte les frais Stripe (pourcentage + fixe par transaction, frais Connect), non restitués en cas de remboursement. `marge_nette = commission_totale − frais_stripe(montant_total_acheteur) − frais_connect`. Simulation obligatoire avant développement (§17.3) sur des paniers de 3 €, 10 €, 25 €, 100 € et 300 €, cartes UE et hors UE.

### 7.2 Stripe Connect

- **Modèle :** Separate Charges and Transfers sur comptes Express (remplace les Destination Charges de la v1.2, qui transfèrent immédiatement).
  1. Checkout : création d'un PaymentIntent sur le compte plateforme (montant = `montant_total_acheteur`, `transfer_group = commande_<id>`, `metadata.commande_id`), confirmé côté client via Payment Element. Les montants sont toujours recalculés côté serveur.
  2. Webhook `payment_intent.succeeded` : seule source de vérité du paiement → commande `payee`.
  3. Libération : `Transfer` vers `stripe_account_id` d'un montant `montant_produit + frais_livraison − remboursements`, même `transfer_group`, `source_transaction` = charge, clé d'idempotence `transfer_<commande_id>`.
  4. La commission est la part retenue par la plateforme (pas d'`application_fee_amount`).
  5. Versements vers la banque du vendeur : calendrier de payout du compte Express.
- **KYC :** onboarding Stripe hosted. Mode imprimeur actif seulement si `stripe_onboarding_complete`.
- **Remboursements :** Stripe Refunds API, depuis l'admin ou automatiquement (annulation, non-expédition). Avant libération : remboursement du PaymentIntent. Remboursement total : produit + livraison + commission restitués. Remboursement partiel : porte sur produit/livraison, commission conservée sauf décision admin. Après libération (cas exceptionnel, fraude) : Transfer Reversal + refund, soumis au solde du vendeur ; risque porté par la plateforme.
- **Webhooks :** vérification de signature, déduplication via `stripe_webhook_events`, traitement idempotent par job BullMQ avec retries, alerte sur échec persistant.
- **Paiement mobile :** Payment Element (carte) dans le WebView Capacitor. Apple Pay / Google Pay : à valider (limites du WebView, plugin natif éventuel).
- **Spike technique préalable :** confirmer dans la documentation Stripe le délai maximal de rétention avant transfert et l'éligibilité d'une marketplace d'impression 3D (§17.3).

### 7.3 Libération des fonds

| Situation | Règle |
|---|---|
| Envoi | Libération à la confirmation de l'acheteur, ou automatiquement à `date_expedition` + `RELEASE_DELAY_SHIPPED_DAYS` (7 j), si aucun litige ouvert |
| Remise en main propre | Le vendeur marque « remis » ; confirmation par l'acheteur (bouton ou saisie du `code_remise`), sinon libération automatique à + `RELEASE_DELAY_HANDOVER_DAYS` (3 j) |
| Non-expédition | `date_limite_expedition` = `date_paiement` + délai annoncé + `SHIPPING_GRACE_DAYS` (3 j), plafonné à `MAX_SHIPPING_DAYS` (21 j). Rappel vendeur 2 jours avant l'échéance. À l'échéance : commande `annulee` (`non_expedition`), remboursement intégral automatique, incident enregistré sur le vendeur. **Aucune libération sans expédition marquée** |
| Litige ouvert | Minuteur de libération suspendu jusqu'à la décision (§8.4) |
| Annulation par le vendeur avant expédition | Autorisée, remboursement intégral, incident enregistré |

### 7.4 Paramètres configurables (variables d'environnement)

| Variable | Défaut |
|---|---|
| `COMMISSION_PCT` | 3 |
| `COMMISSION_FIXED_CENTS` | 80 |
| `PRICE_MIN_CENTS` | 300 |
| `OFFER_MIN_RATIO` | 0.5 |
| `OFFER_TTL_HOURS` | 48 |
| `OFFER_PAYMENT_TTL_HOURS` | 24 |
| `DEVIS_TTL_DAYS` | 7 |
| `DEVIS_PAYMENT_TTL_HOURS` | 48 |
| `CHECKOUT_TTL_MINUTES` | 30 |
| `DEMANDE_TTL_DAYS` | 15 |
| `SHIPPING_GRACE_DAYS` | 3 |
| `MAX_SHIPPING_DAYS` | 21 |
| `RELEASE_DELAY_SHIPPED_DAYS` | 7 |
| `RELEASE_DELAY_HANDOVER_DAYS` | 3 |
| `DISPUTE_SELLER_RESPONSE_HOURS` | 72 |
| `VACATION_INACTIVITY_DAYS` | 15 |
| `REVIEW_WINDOW_DAYS` | 14 |
| `MAX_UPLOAD_IMAGE_MB` | 10 |
| `MAX_UPLOAD_3D_MB` | 50 |
| `SELLER_ALERT_SALES` / `SELLER_ALERT_REVENUE_CENTS` | 20 / 150000 |

---

## 8. Flux fonctionnels

### 8.1 Achat direct (annonce de vente)

```
Acheteur → Fiche annonce → Checkout (mode de livraison, adresse si envoi)
→ Réservation du stock / de la pièce unique (CHECKOUT_TTL_MINUTES)
→ Paiement Stripe (PaymentIntent plateforme) → webhook → commande "payee"
→ Vendeur notifié → fabrique, marque "expédié" + tracking optionnel
→ Acheteur notifié → "Tout est OK" (libération immédiate) OU "Signaler un problème"
   OU timer de libération automatique
→ Transfert Stripe au vendeur (commission retenue)
→ Invitation avis (double-aveugle)
```

L'expiration du checkout annule la commande `en_attente_paiement`, annule le PaymentIntent et libère la réservation (job BullMQ).

### 8.2 Achat via demande → devis

```
Acheteur publie une demande
→ Visible dans le feed imprimeurs (fichier 3D réservé aux imprimeurs authentifiés)
→ Imprimeurs soumettent des devis (validité DEVIS_TTL_DAYS)
→ Acheteur accepte un devis (48 h pour payer)
→ Checkout → même flux que 8.1
→ Au paiement : autres devis "refuse", demande "cloturee"
```

### 8.3 Achat via négociation messagerie

```
Acheteur clique "Contacter" sur une annonce de vente
→ Conversation créée avec contexte annonce
→ Échange de messages + pièces jointes
→ Offre / contre-offres (annonce avec offres_autorisees)
→ Offre acceptée → CTA "Finaliser l'achat" (24 h pour payer)
→ Checkout au montant de l'offre acceptée → même flux que 8.1
```

### 8.4 Litige

```
Acheteur → "Signaler un problème" (de payee jusqu'à la libération)
→ Motif + description + photos (sauf "non reçu") → commande "litige", minuteur suspendu
→ Vendeur notifié, DISPUTE_SELLER_RESPONSE_HOURS pour répondre
→ Admin arbitre (objectif : 5 jours ouvrés)
→ Décision : remboursement total (commande "remboursee")
           | remboursement partiel (solde libéré, commande "livree")
           | rejet (libération immédiate, commande "livree")
```

Pas de litige géré par la plateforme après libération des fonds, sauf fraude constatée (décision admin).

### 8.5 Non-expédition

Voir §7.3 : rappel, annulation automatique, remboursement intégral.

---

## 9. Écrans (V1)

| Écran | Description |
|---|---|
| Inscription / connexion | Email + mot de passe, Google, Apple, vérification d'email, mot de passe oublié |
| Home / Feed | Annonces de vente + section demandes récentes, pagination par curseur |
| Recherche | Texte libre (français, tolérance aux fautes) ; filtres : catégorie, matériau, prix min/max, distance (km) au vendeur, retrait main propre / envoi, disponibilité ; tri : pertinence, récent, prix, distance |
| Fiche annonce vente | Photos, prix, délai d'expédition, livraison, profil vendeur, CTA achat, CTA Contacter, signalement. Indexable (meta, Open Graph, JSON-LD Product) |
| Fiche demande | Détail, fichier 3D (imprimeurs authentifiés), matériau/couleur/quantité souhaités, liste des devis (acheteur) ou formulaire de devis (imprimeur) |
| Profil imprimeur | Bio, imprimantes + dimensions max, matériaux, localisation approximative, délai moyen, prix indicatif, disponibilité, avis, annonces actives |
| Créer annonce | Sélecteur Vente / Demande → formulaire adapté |
| Mes annonces / Mes demandes | Gestion, pause, archivage, devis reçus |
| Checkout | Récapitulatif produit + livraison + commission + paiement Stripe, choix du mode de livraison, adresse |
| Mes commandes / Mes ventes | Historique, statut, actions contextuelles (expédier, confirmer, signaler un problème, code de remise) |
| Litige | Ouverture, suivi, réponse vendeur |
| Avis | Dépôt après livraison |
| Messagerie — liste | Conversations actives, badge non-lu |
| Messagerie — thread | Messages + pièces jointes + « Faire une offre » + signalement + blocage |
| Mon profil | Édition, mode vendeur, onboarding Stripe |
| Paramètres | Préférences de notification, utilisateurs bloqués, export des données, suppression du compte |
| Notifications | Centre de notifications in-app (composant Inbox Novu) |
| Pages légales | CGU, confidentialité, cookies, charte de contenu, contact, médiation |
| Admin — dashboard | KPIs : volume de transactions, commandes, conversion demande → devis → commande, taux de litige, délai moyen d'expédition, revenu de commission, incidents vendeurs |
| Admin — files de traitement | Signalements, litiges, utilisateurs, annonces, journal d'audit |

---

## 10. Notifications

Transactionnelles (non désactivables) : commandes, paiements, litiges, modération. Les autres canaux sont désactivables par l'utilisateur.

| Événement | Destinataire | Canal |
|---|---|---|
| Nouveau devis reçu | Acheteur | Push + email |
| Devis accepté / refusé | Imprimeur | Push + email |
| Paiement échoué | Acheteur | In-app + email |
| Commande payée | Vendeur | Push + email |
| Rappel d'expédition (échéance − 2 j) | Vendeur | Push + email |
| Annulation automatique faute d'expédition | Acheteur + vendeur | Push + email |
| Commande expédiée | Acheteur | Push + email |
| Confirmation de réception attendue (expédition + 5 j) | Acheteur | Push + email |
| Libération automatique imminente (expédition + 6 j) | Acheteur | Push |
| Fonds libérés | Vendeur | Push + email |
| Litige ouvert | Vendeur + admin | Push + email |
| Litige tranché | Acheteur + vendeur | Push + email |
| Offre reçue / contre-offre reçue | Destinataire | Push |
| Offre expirée | Émetteur | Push |
| Nouveau message | Destinataire | Push (regroupé : 1 push par conversation et par 5 min si non lu) ; email de rappel seulement après 30 min sans lecture |
| Demande bientôt expirée (J+13) | Acheteur | Push |
| Mode vacances imminent (J+12) / activé | Imprimeur | Push + email / email |
| Avis à déposer (livraison + 3 j) / avis reçu | Utilisateur | Push |
| Annonce suspendue | Vendeur | Email |
| Signalement pris en charge | Reporter | Email |
| Nouvelle demande correspondant à mes matériaux | Imprimeur | Désactivé par défaut |

Le regroupement des notifications de message est obligatoire : chaque notification consomme un workflow run Novu (plan Free : 10 000 runs/mois, 20 workflows, 3 membres — grille à revérifier à la souscription ; bascule Pro dès dépassement).

---

## 11. Catégories d'annonces (V1)

Décoration · Figurines & Jeux · Pièces techniques & fonctionnelles · Bijoux & Accessoires · Maison & Rangement · Éducation & Maquettes · Sur-mesure / Personnalisé · Autre

---

## 12. Modération et contenus interdits

### 12.1 Contenus interdits (charte et CGU)

- Armes et éléments d'armes : armes à feu, pièces ou chargeurs, silencieux, répliques fonctionnelles, armes blanches
- Dispositifs de contournement de sécurité ou destinés à des actes illicites
- Contrefaçon et atteinte à la propriété intellectuelle : marques, personnages ou modèles sous licence sans autorisation
- Pièces de sécurité critiques (freinage, harnais, équipements médicaux) et allégations de conformité alimentaire, médicale ou normative non justifiées
- Contenu sexuellement explicite, haineux, violent ou illégal
- Tout échange ou paiement hors plateforme visant à contourner la commission

L'acheteur qui téléverse un fichier 3D déclare détenir les droits nécessaires (clause CGU).

### 12.2 Processus

- Signalement d'une annonce, d'un message, d'un utilisateur ou d'un avis (§5 `signalements`).
- File de modération unique ; objectif de traitement : 48 h ouvrées.
- Actions : avertissement | suspension d'annonce | suspension temporaire de compte | ban.
- Suspension d'annonce : statut `suspendu`, retrait du feed, email au vendeur avec motif et voies de recours (décision motivée).
- Notification des contenus illicites : formulaire dédié (propriété intellectuelle, contenu illégal), retrait diligent, information motivée de l'utilisateur concerné, possibilité de contester.
- Litige de commande : remboursement total ou partiel via Stripe Refund API (§8.4).
- Ban ou suspension d'un vendeur : décision admin explicite sur les fonds des commandes en cours.
- Rôles : `moderateur` (signalements, suspensions), `admin` (litiges, remboursements, bans, accès fiscal). Toute action est inscrite dans `admin_audit_log`.
- Suivi des incidents vendeur (annulations pour non-expédition, litiges perdus) dans le dashboard ; avertissement automatique au-delà de 3 incidents sur 90 jours.

---

## 13. Contraintes non-fonctionnelles

### 13.1 Performance et disponibilité
- API : p95 < 500 ms hors upload ; feed paginé par curseur (20 éléments) ; LCP web < 2,5 s sur fiche annonce.
- Disponibilité cible 99,5 %, sans haute disponibilité en V1 (VPS unique, risque accepté).
- Offline partiel : consultation du cache du feed ; les actions nécessitent une connexion.
- Cibles Capacitor : iOS 15+ / Android 10+.
- Accessibilité : WCAG AA sur les parcours principaux.

### 13.2 Recherche
PostgreSQL full-text (configuration `french`, colonne `tsvector` indexée) + `pg_trgm`. Filtre de distance via PostGIS, rayon en km paramétrable par l'acheteur. Moteur dédié (Meilisearch) envisagé en V2 si nécessaire.

### 13.3 Exploitation
- Sauvegardes : dump PostgreSQL quotidien chiffré + synchronisation MinIO vers un stockage externe à l'hébergeur du VPS ; rétention 30 jours ; test de restauration trimestriel. RPO 24 h, RTO 4 h.
- Environnements : local (Docker Compose), staging (Stripe en mode test, Novu environnement de développement), production.
- Migrations Prisma versionnées, rétro-compatibles d'une version à l'autre, appliquées par `prisma migrate deploy` dans le pipeline.
- Supervision : Sentry, healthchecks (API, base, Redis, MinIO), uptime externe, alertes sur échecs de jobs BullMQ et de webhooks Stripe.

### 13.4 Stores mobiles
Contenu généré par les utilisateurs : signalement, blocage et modération requis dès la V1. Suppression de compte accessible depuis l'application. Connexion Apple obligatoire dès qu'une connexion sociale est proposée. Paiement de biens physiques par Stripe (hors achats intégrés). Exigences à revérifier avant la première soumission.

### 13.5 CI/CD et Definition of Done transverse

**Pipeline GitHub Actions** :
- Sur chaque pull request : lint, typecheck, tests unitaires, tests d'intégration/e2e API (services Postgres, Redis), build Docker, vérification des migrations Prisma sur base vide, audit des dépendances, détection de secrets.
- Merge sur `main` : déploiement automatique sur staging.
- Tag de version : déploiement en production après approbation manuelle ; procédure de rollback documentée.
- Mobile : builds Capacitor automatisés vers TestFlight et piste interne Google Play.

**Definition of Done (toute fonctionnalité) :**
- Pipeline entièrement vert avant merge ; aucune fusion avec test désactivé ou en échec.
- Tests couvrant les règles métier critiques : calcul de commission et arrondis, machines d'états des commandes et des offres, libération, expirations, non-expédition. Couverture ≥ 80 % sur les modules `payments`, `orders`, `offers`.
- Webhooks Stripe testés avec événements simulés, y compris doublons et ordre inversé.
- Migrations rejouables de zéro et sur une copie de staging.
- Parcours critiques validés en e2e : inscription → onboarding vendeur → achat → expédition → libération (Stripe en mode test).
- Fonctionnalité déployée et vérifiée sur staging avant clôture.
- Aucun secret dans le dépôt ; aucune donnée personnelle ni PAN dans les logs.

---

## 14. Conformité légale et RGPD

À faire valider par un juriste et un comptable avant mise en production (§17.3).

### 14.1 Documents obligatoires
CGU (incluant la charte de contenu et les règles de litige), conditions de vente de la plateforme, politique de confidentialité, politique de cookies, mentions légales, point de contact public, référence à un médiateur de la consommation.

### 14.2 RGPD
- Bases légales : exécution du contrat (compte, commandes), obligation légale (comptabilité, déclarations fiscales), consentement (push, cookies non essentiels, marketing).
- Sous-traitants à encadrer (DPA / clauses contractuelles types) : Stripe, Resend, Novu, Firebase, hébergeur OVH, Sentry.
- Durées de conservation : commandes et pièces comptables 10 ans ; messages 24 mois après la dernière activité (sauf signalement) ; comptes inactifs : avertissement puis suppression après 3 ans ; logs techniques 12 mois.
- Droits : suppression du compte dans l'application (anonymisation, conservation des commandes sous forme anonymisée pour les obligations légales), export des données au format JSON.
- Minimisation : localisation exacte jamais exposée ; EXIF supprimé des images ; données fiscales isolées (`vendeurs_fiscal`).

### 14.3 Obligations de plateforme
- **Information et déclaration fiscales :** informer les vendeurs de leurs obligations fiscales ; transmettre chaque année à l'administration les données des vendeurs au titre de DAC7 (identité, adresse, date de naissance, NIF, montants et nombre de transactions) et leur remettre un récapitulatif annuel. Seuils d'exclusion DAC7 indiqués : 30 ventes ou 2 000 € par an, à confirmer. Collecte de `vendeurs_fiscal` à l'activation du mode vendeur.
- **Seuil d'alerte vendeur habituel :** à `SELLER_ALERT_SALES` ventes ou `SELLER_ALERT_REVENUE_CENTS` de revenus sur 12 mois glissants, message d'information sur le statut professionnel ; V2 : bascule vers compte pro.
- **Règlement sur les services numériques (DSA) :** obligations d'hébergeur (conditions générales claires, mécanisme de notification des contenus illicites, information motivée des décisions de modération, point de contact). Exemptions des plateformes micro/petites entreprises à vérifier.
- **Rétractation :** non applicable entre particuliers. La protection acheteur est contractuelle (§8.4).
- **Exploitant :** statut juridique, franchise de TVA et TVA sur la commission, encaissement pour compte de tiers : à valider.

---

## 15. Sécurité

### 15.1 Authentification et accès
- Mots de passe hachés (argon2id). Email vérifié obligatoire avant publication, achat ou vente.
- Access token JWT 15 min ; refresh token 30 jours, rotatif, haché en base, révocation et détection de réutilisation par famille.
- Web : cookies httpOnly, Secure, SameSite, protection CSRF. Mobile : stockage sécurisé natif (Keychain / Keystore).
- Réinitialisation de mot de passe : jeton à usage unique, durée 1 h.
- Rate limiting (Redis) sur connexion, inscription, réinitialisation, messages, offres, signalements ; verrouillage temporaire après échecs répétés.
- Contrôle de propriété (anti-IDOR) et de rôle sur chaque endpoint ; validation stricte des DTO (liste blanche, champs inconnus rejetés).
- CORS restreint, en-têtes de sécurité (CSP, HSTS), requêtes paramétrées.

### 15.2 Fichiers
- Contrôle du type par signature binaire (pas seulement le Content-Type) et limites de taille : images `MAX_UPLOAD_IMAGE_MB`, fichiers 3D `MAX_UPLOAD_3D_MB`, 10 photos maximum par annonce.
- Images ré-encodées (webp), EXIF supprimé (dont la géolocalisation).
- Analyse antivirus ClamAV de tout upload, fichier en quarantaine tant que non validé.
- 3MF (archive ZIP) : limites de taille décompressée et de nombre d'entrées (protection contre les zip bombs). Aucun traitement ni rendu côté serveur en V1.
- Fichiers 3D et pièces jointes de messagerie : stockage privé, URL présignée de courte durée, accès restreint aux ayants droit (demandeur, imprimeurs authentifiés, participants de la conversation).

### 15.3 Paiement et secrets
- Montants jamais acceptés du client. Webhooks Stripe : signature vérifiée, idempotence, déduplication (§7.2).
- Secrets hors dépôt (variables d'environnement / secrets Docker), rotation documentée.
- Dépendances : audit automatisé, versions verrouillées.

---

## 16. Récapitulatif V1 / V2

| Fonctionnalité | V1 | V2 |
|---|---|---|
| Annonces de vente, demandes, devis, offres | ✔ | |
| Messagerie temps réel, signalement, blocage | ✔ | |
| Profil imprimeur, mode vacances | ✔ | |
| Retrait en main propre, code de remise | ✔ | |
| Litiges, avis double-aveugle | ✔ | |
| Séquestre Stripe (Separate Charges and Transfers) | ✔ | |
| Comptes pro, SIRET/SIRENE, facturation B2B, CGU pro | | ✔ |
| Intégration transporteurs (Mondial Relay, Colissimo), étiquettes | | ✔ |
| Parsing et validation des STL/3MF (dimensions, volume) | | ✔ |
| Moteur de recherche dédié | | ✔ |
| Offres sur quantités > 1 | | ✔ |

---

## 17. Décisions et points ouverts

### 17.1 Résolus (v1.2)

1. **Offre messagerie — frais de livraison :** l'offre porte uniquement sur le prix produit ; frais repris de l'annonce, non négociables.
2. **Retrait en main propre :** inclus en V1 (`mode_livraison`), localisation sur `users` pour le tri par distance.
3. **Comptes pro / SIRET :** V2. Aucun compte pro, aucune vérification SIRENE en V1.
4. **Expiration des demandes :** J+15, prolongeable une fois ; imprimeur inactif 15 jours → mode vacances.
5. **Intégration transporteur :** V2 (Mondial Relay + Colissimo). Schéma `commandes` prêt à absorber `tracking_carrier`, `tracking_url`, `label_pdf_key`.
6. **Format prix imprimeur :** forfait au gramme avec surcharge par catégorie (`tarifs_indicatifs`), indicatif ; le devis fait foi.
7. **Filtre proximité :** rayon en km paramétrable par l'acheteur.
8. **STL/3MF côté demande :** pas de parsing en V1, mais contrôles de sécurité (§15.2). Validation des dimensions en V2.

### 17.2 Tranchés en v1.3 (à valider)

1. **Libération J+21 absolu :** supprimée. Sans expédition marquée avant `date_limite_expedition`, annulation et remboursement intégral automatiques (§7.3).
2. **Seuil du mode vacances :** compté par imprimeur sur l'activité (messages envoyés, devis, commandes, annonces), non sur les seules demandes de devis non traitées. Règle détaillée en §5.
3. **Offres sur demandes :** supprimées ; devis uniquement.
4. **Blocage utilisateur :** activé dès la V1.
5. **Novu :** version cloud en V1.
6. **Séquestre :** Separate Charges and Transfers.

### 17.3 Restants

1. **Spike Stripe :** délai maximal de rétention avant transfert, éligibilité Connect de la marketplace, Apple Pay / Google Pay en WebView Capacitor.
2. **Simulation de marge :** commission (3 % + 0,80 €) contre frais Stripe et Connect sur les paniers de référence (§7.1) ; ajustement éventuel du prix plancher ou des taux.
3. **Validation juridique et comptable :** DAC7 (seuils, NIF), DSA, médiateur, statut de l'exploitant et TVA sur commission, encaissement pour compte de tiers, mentions des CGU.
4. **Valeurs par défaut du §7.4 :** à confirmer (notamment `MAX_UPLOAD_3D_MB` et `OFFER_MIN_RATIO`).
