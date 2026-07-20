#!/bin/sh
set -eu
set -o pipefail

if [ -z "${PRODUCTION_DATABASE_URL:-}" ]; then
  echo "Set PRODUCTION_DATABASE_URL before running the production sync." >&2
  exit 1
fi

echo "Replacing local IFNBL data with a production database snapshot..."
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO ifnbl;
GRANT ALL ON SCHEMA public TO public;
SQL

pg_dump "$PRODUCTION_DATABASE_URL" --no-owner --no-privileges \
  | sed '/^SET transaction_timeout = 0;$/d' \
  | psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1

echo "Local database sync complete."
