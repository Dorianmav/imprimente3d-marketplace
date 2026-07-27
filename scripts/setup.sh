#!/usr/bin/env bash
###############################################################################
# setup.sh
#
# Script de setup complet du projet "imprimente3d-marketplace".
#
# Étapes réalisées :
#   1. Lance ./script/update.sh (mise à jour du projet : pull, install, etc.)
#   2. Supprime backend/src/generated et régénère le client Prisma
#   3. Redémarre le service "backend" via docker compose (down -v puis up --build)
#
# Utilisation :
#   ./script/setup.sh
#
# Prérequis :
#   - bash
#   - node / npx installés (pour prisma generate)
#   - docker + docker compose (plugin v2) installés
###############################################################################

# Arrête le script au premier échec, et échoue si une variable est vide/undefined
set -euo pipefail

# --- Petites fonctions d'affichage pour rendre les logs plus lisibles ---
info()  { printf '\n\033[1;34m[INFO]\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m[ OK ]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[FAIL]\033[0m %s\n' "$1" >&2; }

# --- Détermine le dossier où se trouve ce script, quel que soit l'endroit
#     depuis lequel on l'appelle, pour que les chemins relatifs soient fiables ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"       # racine du repo (parent de /script)
BACKEND_DIR="$ROOT_DIR/backend"

# Petit filet de sécurité : on affiche où on travaille, pour éviter les surprises
info "Dossier script : $SCRIPT_DIR"
info "Dossier racine : $ROOT_DIR"
info "Dossier backend : $BACKEND_DIR"

###############################################################################
# 1. Lancement de update.sh
###############################################################################
info "Étape 1/3 : exécution de update.sh"

UPDATE_SCRIPT="$SCRIPT_DIR/update.sh"

if [[ ! -f "$UPDATE_SCRIPT" ]]; then
    error "update.sh introuvable dans $SCRIPT_DIR"
    exit 1
fi

# On s'assure que le script est exécutable (au cas où les droits auraient sauté,
# par ex. après un clone git sur certains systèmes)
chmod +x "$UPDATE_SCRIPT"

# On se place dans le dossier script pour que update.sh s'exécute
# avec les mêmes chemins relatifs que s'il était lancé "à la main"
(
    cd "$SCRIPT_DIR"
    ./update.sh
)

ok "update.sh terminé"

###############################################################################
# 2. Régénération du client Prisma
###############################################################################
info "Étape 2/3 : régénération du client Prisma"

if [[ ! -d "$BACKEND_DIR" ]]; then
    error "Dossier backend introuvable : $BACKEND_DIR"
    exit 1
fi

GENERATED_DIR="$BACKEND_DIR/src/generated"

if [[ -d "$GENERATED_DIR" ]]; then
    info "Suppression de $GENERATED_DIR"
    rm -rf "$GENERATED_DIR"
    ok "Dossier generated supprimé"
else
    info "Aucun dossier generated existant, on passe directement à la génération"
fi

(
    cd "$BACKEND_DIR"
    info "Exécution de 'npx prisma generate' dans $BACKEND_DIR"
    npx prisma generate
)

ok "Client Prisma régénéré"

###############################################################################
# 3. Redémarrage du service backend via docker compose
###############################################################################
info "Étape 3/3 : redémarrage du conteneur backend"

cd "$ROOT_DIR"

# Vérifie que docker compose (plugin v2) est disponible
if ! docker compose version >/dev/null 2>&1; then
    error "'docker compose' introuvable. Installe Docker + le plugin Compose v2."
    exit 1
fi

info "docker compose down -v backend"
# NB : selon la version de Docker Compose installée, 'down' peut ne pas accepter
# de nom de service en argument (il stoppe/supprime alors toute la stack).
# Si c'est le cas chez toi, remplace la ligne ci-dessous par :
#   docker compose stop backend && docker compose rm -f -v backend
docker compose down -v backend

info "docker compose up -d --build"
docker compose up -d --build

ok "Backend redémarré avec succès"

info "Setup terminé avec succès 🎉"