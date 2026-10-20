# Marketplace Impression 3D

Plateforme de mise en relation entre propriétaires d'imprimantes 3D (vendeurs) et acheteurs.

**CDC v1.3** — Specification complète dans `CDC_marketplace_impression3d_v1.3.md`.

## Structure

```
├── backend/           # NestJS API
├── frontend/          # Nuxt 4 (SSR web + Capacitor mobile)
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

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète.

## Stack

- **Backend :** NestJS + TypeScript + Prisma
- **Frontend :** Nuxt 4 + TailwindCSS
- **DB :** PostgreSQL + PostGIS + pg_trgm
- **Cache/Queue :** Redis + BullMQ
- **Stockage :** MinIO (S3-compatible)
- **Auth :** JWT + refresh rotatif + OAuth
- **Paiement :** Stripe Connect Express
- **Notifications :** Novu Cloud + Resend + Firebase FCM
- **Antivirus :** ClamAV
- **Observabilité :** Sentry + Pino logs

## Définition de Done (DoD)

Chaque fonctionnalité doit respecter G1 à G7 du CDC :
- **G1 :** Pipeline CI vert (lint, typecheck, tests, build, migration, audit, secrets)
- **G2 :** Déploiement staging automatique après merge
- **G3 :** Preuve par test automatisé
- **G4 :** Couverture ≥ 80 % sur payments, orders, offers
- **G5 :** Sécurité (anti-IDOR, pas de secrets, pas de PII dans les logs)
- **G6 :** Acceptation totale (un seul critère manquant = rouverte)
- **G7 :** Documentation OpenAPI + migrations versionnées
