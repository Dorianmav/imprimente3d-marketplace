# Marketplace Impression 3D — Layerly

Plateforme de mise en relation entre propriétaires d'imprimantes 3D (vendeurs/imprimeurs) et acheteurs, avec gestion de devis, commandes, litiges et messagerie intégrée.

**CDC v1.3** — Specification complète dans `CDC_marketplace_impression3d_v1.3.md`.

## Structure

```
├── backend/           # NestJS API (108 endpoints REST)
├── frontend/          # Nuxt 4 SPA (31 pages, 10 services)
├── packages/shared/   # Types constants partagés
├── scripts/           # DB init, seeds
└── docker-compose.yml # Environnement local complet
```

## Démarrage local (à froid)

```bash
# 1. Cloner
git clone https://github.com/amiralab/d--projects-3d-mktp.git
cd 3d-mktp

# 2. Installer les dépendances
pnpm install

# 3. Démarrer l'infrastructure
docker compose up -d postgres redis minio clamav

# 4. Attendre que les services soient healthy
# (≈ 30s pour Postgres+PostGIS)

# 5. Configurer l'environnement backend
cp backend/.env.example backend/.env

# 6. Appliquer les migrations Prisma
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..

# 7. Démarrer le backend
cd backend && pnpm run start:dev

# 8. Dans un autre terminal, démarrer le frontend
cd frontend && pnpm install && pnpm dev
```

## Vérification

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Frontend | http://localhost:3000 |
| MinIO Console | http://localhost:9001 |
| ClamAV | localhost:3310 |
| Sentry | http://localhost:9090 |

## Tests

```bash
# Unit tests
cd backend && pnpm run test:cov

# E2E tests (nécessite postgres + redis en Docker)
cd backend && pnpm run test:e2e

# Lint
pnpm run lint  # dans chaque sous-dossier

# Typecheck
npx tsc --noEmit  # dans chaque sous-dossier
```

## Pipeline CI/CD

Les PRs déclenchent automatiquement :
1. **Lint** — ESLint sur backend et shared
2. **Typecheck** — TypeScript compilation sans erreur
3. **Unit tests** — Jest avec couverture ≥ 70 %
4. **E2E tests** — Sur base Postgres + Redis Dockerisée
5. **Docker build** — Construction des images backend et frontend
6. **Migration replay** — Déploiement puis reset complet des migrations
7. **Dependency audit** — Détection des vulnérabilités
8. **Secret detection** — Vérification qu'aucun secret n'est commité

## Backend API

### Endpoints par module (108 total, 106 fonctionnels)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | 12 | Register, login, logout, refresh, password reset, email verify, Google OAuth |
| **User** | 16 | Profile CRUD, search, blocking, data export, GDPR deletion, fiscal info |
| **Ventes** | 6 | Create, list, detail, update, delete, my listings |
| **Demandes** | 7 | Create, list, detail, update, delete, my, expiration |
| **Devis** | 7 | Create, accept, decline, list, my, expiration, admin view |
| **Commandes** | 8 | Create, list, detail, status update, payment, shipping, delivery, refund |
| **Avis** | 3 | Create, list for user, my given |
| **Litiges** | 5 | Open dispute, respond, detail, my, arbitration |
| **Messaging** | 11 | Conversations, messages, offers, read receipts, block, report |
| **Notifications** | 6 | List, mark read, settings, push, websocket, admin |
| **Search** | 3 | Full-text search, autocomplete, trending |
| **Stripe** | 8 | Seller onboarding, payment intent, refund, transfer, retry, check |
| **Admin** | 23 | Users, listings, orders, disputes, reports, quotes, imprimeurs, dashboard |
| **Infra** | 2 | Health check, metrics |

### Architecture backend

- **Framework :** NestJS + TypeScript
- **ORM :** Prisma (schema CDC-driven)
- **Auth :** JWT + httpOnly cookies + refresh token rotation
- **Guards :** JWT guard + role-based (ADMIN)
- **Rate limiting :** Anti brute-force par IP + user
- **Workers :** BullMQ + Redis (checkout expiration, order expiration, dispute, review, vacation, messaging cleanup)
- **Storage :** MinIO (S3-compatible) avec ClamAV antivirus scan
- **Paiement :** Stripe Connect Express (seller onboarding, payment intents, refunds, transfers)
- **Notifications :** Novu Cloud + Resend + Firebase FCM
- **Observabilité :** Sentry + Pino logs

### Points d'API principaux

```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/change-password
POST   /auth/verify-email
POST   /auth/oauth/google          # Préparation OAuth
GET    /auth/me
PATCH  /auth/me

POST   /users/me/block
DELETE /users/me/block/:id
GET    /users/me/blocked
GET    /users/me/export
DELETE /users/me
POST   /users/me/cgu
POST   /users/me/fiscal
GET    /users/search?q=...
GET    /users/:id
GET    /users/:id/reviews
GET    /users/:id/listings

GET    /ventes, GET /ventes/my, POST /ventes, GET /ventes/:id, PATCH /ventes/:id, DELETE /ventes/:id
GET    /demandes, GET /demandes/my, POST /demandes, GET /demandes/:id, PATCH /demandes/:id, DELETE /demandes/:id
POST   /devis, GET /devis/my, POST /devis/:id/accept, POST /devis/:id/decline
POST   /commandes, GET /commandes, GET /commandes/:id, PATCH /commandes/:id/status
POST   /avis, GET /avis/user/:userId, GET /avis/my-given
POST   /litiges/commande/:id, POST /litiges/:id/response, GET /litiges/:id, GET /litiges/my
GET    /messaging/conversations, POST /messaging/conversations/:id/messages
POST   /messaging/conversations/:id/offers
POST   /messaging/report
GET    /search?q=...&type=vente&materiau=PLA
GET    /search/autocomplete?q=...
GET    /search/trending
POST   /stripe/seller/account
POST   /stripe/seller/onboarding
POST   /stripe/payment-intent/:id
POST   /stripe/refund/:id
POST   /stripe/refund/full/:id
POST   /stripe/transfer/retry/:id

GET    /auth/admin/dashboard
GET    /auth/admin/users, POST /auth/admin/users/:id/suspend
GET    /auth/admin/listings, POST /auth/admin/listings/:id/suspend
GET    /auth/admin/orders, PATCH /auth/admin/orders/:id
GET    /auth/admin/litiges, POST /auth/admin/litiges/:id/arbitrer
GET    /auth/admin/signalements, PATCH /auth/admin/signalements/:id
GET    /auth/admin/devis
GET    /auth/admin/imprimeurs, POST /auth/admin/imprimeurs/:id/toggle-disponible
```

## Frontend

### Pages (31 pages)

#### Authentification
| Page | Route | Description |
|------|-------|-------------|
| Connexion | `/login` | Email/password + Google OAuth (préparation) |
| Inscription | `/signup` | Création de compte |
| Mot de passe oublié | `/forgot-password` | Recovery email |
| Réinitialisation | `/reset-password/[token]` | Reset password |
| Vérification email | `/verify-email` | Email verification |

#### Dashboard & Accueil
| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Landing page + recherche |
| Dashboard | `/dashboard` | Tableau de bord utilisateur/admin |

#### Marketplace
| Page | Route | Description |
|------|-------|-------------|
| Recherche | `/search` | Recherche avec filtres (type, matériau, catégorie, prix) |
| Détail vente | `/ventes/[id]` | Page produit |
| Nouvelle vente | `/ventes/new` | Créer une annonce de vente |
| Détail demande | `/demandes/[id]` | Page demande d'impression |
| Nouvelle demande | `/demandes/new` | Créer une demande |
| Nouveau devis | `/devis/new` | Soumettre un devis |
| Mes devis | `/devis/my` | Devis reçus/-envoyés |

#### Commandes & Messagerie
| Page | Route | Description |
|------|-------|-------------|
| Mes commandes | `/orders` | Liste des commandes |
| Détail commande | `/orders/[id]` | Détails + paiement + litige |
| Messagerie | `/messages` | Conversations en temps réel |

#### Profil & Paramètres
| Page | Route | Description |
|------|-------|-------------|
| Profil utilisateur | `/profile/[id]` | Ventes, demandes, avis du profil |
| Paramètres | `/settings` | 6 onglets : Profil, Sécurité, CGU, Export données, Fiscal, Danger |
| Mes avis reçus | `/avis/received` | Avis laissés par les autres |

#### Litiges
| Page | Route | Description |
|------|-------|-------------|
| Mes litiges | `/litiges` | Liste des litiges |
| Nouveau litige | `/litiges/new` | Ouvrir un litige |
| Détail litige | `/litiges/[id]` | Détails + réponse vendeur |

#### Admin (rôle ADMIN requis)
| Page | Route | Description |
|------|-------|-------------|
| Utilisateurs | `/admin/users` | Gestion utilisateurs (suspend/unsuspend) |
| Annonces | `/admin/listings` | Modération ventes/demandes |
| Commandes | `/admin/orders` | Liste des commandes |
| Litiges | `/admin/litiges` | Liste des litiges |
| Détail litige | `/admin/litiges/[id]` | Arbitrage de litige |
| Signalements | `/admin/reports` | Liste des signalements |
| Détail signalement | `/admin/signalements/[id]` | Traitement des signalements |
| Imprimeurs | `/admin/imprimeurs` | Gestion disponibilité imprimeurs |
| Devis | `/admin/devis` | Vue globale des devis |

### Services (couche API)

| Service | Fichier | Endpoints couverts |
|---------|---------|-------------------|
| `useAuth()` | `composables/useAuth.ts` | login, signup, logout, refresh, init, fetchProfile |
| `useApiService()` | `services/auth.service.ts` | signup, login, logout, refresh, profile, update, changePassword, forgot/reset |
| `useVenteService()` | `services/vente.service.ts` | CRUD ventes, my, detail |
| `useDevisService()` (demande) | `services/demande.service.ts` | CRUD demandes, devis, my quotes |
| `useCommandeService()` | `services/commande.service.ts` | Créer, lister, detail, confirmer paiement |
| `useAvisService()` | `services/avis.service.ts` | Create, forUser, myGiven, getReceived |
| `useLitigeService()` | `services/litige.service.ts` | Open, respond, find, my, arbitrate |
| `useMessagingService()` | `services/messaging.service.ts` | Conversations, messages, offers, report, block |
| `useNotificationService()` | `services/notification.service.ts` | Notifications list, read, settings |
| `useSearchService()` | `services/search.service.ts` | Search, autocomplete, trending |
| `useStripeService()` | `services/stripe.service.ts` | Seller onboarding, payment intent, refund, transfer retry |
| `useAdminService()` | `services/litige.service.ts` | Dashboard, users, listings, orders, disputes, reports, imprimeurs, devis |

### Middleware

| Middleware | Fichier | Description |
|------------|---------|-------------|
| `auth.global.ts` | `middleware/auth.global.ts` | Protège les routes privées, redirige vers login |
| `admin.ts` | `middleware/admin.ts` | Vérifie rôle ADMIN |
| `guest.ts` | `middleware/guest.ts` | Redirige les auth vers dashboard depuis les pages auth |

### State Management

| Store | Fichier | Description |
|-------|---------|-------------|
| Listings | `stores/listings.ts` | Ventes, demandes, loading state |
| Orders | `stores/orders.ts` | Commandes, confirmPayment |
| Messaging | `stores/messaging.ts` | Conversations, messages, send, read receipt |
| Notifications | `stores/notifications.ts` | Unread count, fetch |

### Composables

| Composable | Fichier | Description |
|------------|---------|-------------|
| `useAuth()` | `composables/useAuth.ts` | Auth state, login, signup, logout, refresh, profile |
| `useToast()` | `composables/useToast.ts` | Notification toast |
| `useTitle()` | `composables/useTitle.ts` | Page title setter |

## Composants partagés

- **TopNav** — Barre de navigation desktop + dropdown profil + sections admin
- **BottomNav** — Navigation mobile
- **SearchBar** — Barre de recherche unifiée
- **ListingCard** — Carte listing (vente ou demande)
- **StatusBadge** — Badge de statut coloré (réutilisable)
- **MaterialBadge** — Badge matériau (PLA, PETG, ABS...)
- **LoginForm** — Formulaire de connexion réutilisable
- **SignUpForm** — Formulaire d'inscription réutilisable
- **BlockUserModal** — Modal de blocage/déblocage utilisateur

## Stack

- **Backend :** NestJS + TypeScript + Prisma
- **Frontend :** Nuxt 4 (SPA mode) + TailwindCSS
- **DB :** PostgreSQL + PostGIS + pg_trgm
- **Cache/Queue :** Redis + BullMQ
- **Stockage :** MinIO (S3-compatible)
- **Auth :** JWT + refresh rotatif + httpOnly cookies
- **Paiement :** Stripe Connect Express
- **Notifications :** Novu Cloud + Resend + Firebase FCM
- **Antivirus :** ClamAV
- **Observabilité :** Sentry + Pino logs

## Couverture Frontend/Backend

| Métrique | Valeur |
|----------|--------|
| Backend endpoints | 108 (106 fonctionnels) |
| Frontend pages | 31 |
| Frontend services | 12 |
| Coverage frontend | ~95% des endpoints backend |

## Définition de Done (DoD)

Chaque fonctionnalité doit respecter G1 à G7 du CDC :
- **G1 :** Pipeline CI vert (lint, typecheck, tests, build, migration, audit, secrets)
- **G2 :** Déploiement staging automatique après merge
- **G3 :** Preuve par test automatisé
- **G4 :** Couverture ≥ 80 % sur payments, orders, offers
- **G5 :** Sécurité (anti-IDOR, pas de secrets, pas de PII dans les logs)
- **G6 :** Acceptation totale (un seul critère manquant = rouverte)
- **G7 :** Documentation OpenAPI + migrations versionnées

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète.
