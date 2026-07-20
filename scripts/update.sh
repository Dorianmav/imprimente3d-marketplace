#!/usr/bin/env bash
set -euo pipefail

for dir in frontend backend; do
  if [ -d "./$dir" ]; then
    rm -rf "./$dir/node_modules"
    (cd "./$dir" && npm i)
  else
    echo "Dossier ./$dir introuvable" >&2
  fi
done