#!/bin/sh
set -eu

DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-253421}"
export PGPASSWORD="$DB_PASSWORD"

echo "[postgres-bootstrap] Waiting for PostgreSQL..."
until pg_isready -h postgres -U "$DB_USER" >/dev/null 2>&1; do
  sleep 2
done

ensure_database() {
  db_name="$1"
  if psql -h postgres -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1; then
    echo "[postgres-bootstrap] Database '${db_name}' already exists."
  else
    echo "[postgres-bootstrap] Creating database '${db_name}'..."
    createdb -h postgres -U "$DB_USER" "$db_name"
  fi
}

ensure_database "finance_db"
ensure_database "news_db"
ensure_database "keycloak"

echo "[postgres-bootstrap] Database bootstrap completed."
