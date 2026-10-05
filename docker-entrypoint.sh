#!/bin/sh
set -e
echo "[entrypoint] prisma migrate deploy..."
# --no-install: pakai CLI lokal di image, jangan download dari registry
npx --no-install prisma migrate deploy
exec "$@"
