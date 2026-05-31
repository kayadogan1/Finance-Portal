#!/bin/sh
set -eu

KEYCLOAK_SERVER="${KEYCLOAK_SERVER:-http://keycloak:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="${KEYCLOAK_REALM:-FinancePortal}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-finance-gateway-client}"
DEFAULT_ROLE="${KEYCLOAK_DEFAULT_ROLE:-default-roles-financeportal}"
USER_ROLE="${KEYCLOAK_USER_ROLE:-USER}"
KCADM="/opt/keycloak/bin/kcadm.sh"

echo "[keycloak-bootstrap] Waiting for Keycloak..."
until "$KCADM" config credentials \
  --server "$KEYCLOAK_SERVER" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1; do
  sleep 5
done

echo "[keycloak-bootstrap] Waiting for realm '${REALM}'..."
until "$KCADM" get "realms/${REALM}" >/dev/null 2>&1; do
  sleep 3
done

echo "[keycloak-bootstrap] Enabling user registration for realm '${REALM}'..."
"$KCADM" update "realms/${REALM}" -s registrationAllowed=true -s loginTheme=finance

echo "[keycloak-bootstrap] Ensuring default USER role mapping..."
"$KCADM" add-roles \
  -r "$REALM" \
  --rname "$DEFAULT_ROLE" \
  --cclientid "$CLIENT_ID" \
  --rolename "$USER_ROLE" >/dev/null 2>&1 || true

echo "[keycloak-bootstrap] Ensuring existing users have USER role..."
usernames=$("$KCADM" get users -r "$REALM" --fields username 2>/dev/null \
  | grep -o '"username" *: *"[^"]*"' \
  | sed 's/.*: *"//;s/"$//' || true)

for username in $usernames; do
  "$KCADM" add-roles \
    -r "$REALM" \
    --uusername "$username" \
    --cclientid "$CLIENT_ID" \
    --rolename "$USER_ROLE" >/dev/null 2>&1 || true
done

echo "[keycloak-bootstrap] Keycloak bootstrap completed."
