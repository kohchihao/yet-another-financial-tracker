#!/usr/bin/env bash
# One read-only check: this process is the local anonymous CSPX deployment and the app answers.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
cd "$ROOT"

if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "FAIL doctor: CONVEX_DEPLOY_KEY is set in the environment" >&2
  exit 1
fi
if [ ! -f "$ROOT/.env.local" ]; then
  echo "FAIL doctor: $ROOT/.env.local is missing (launch.sh has not configured a local deployment)" >&2
  exit 1
fi
if grep -q '^CONVEX_DEPLOY_KEY=' "$ROOT/.env.local"; then
  echo "FAIL doctor: .env.local contains CONVEX_DEPLOY_KEY" >&2
  exit 1
fi

deployment=$(grep -E '^CONVEX_DEPLOYMENT=' "$ROOT/.env.local" | head -n 1 | cut -d= -f2-)
convex_url=$(grep -E '^NEXT_PUBLIC_CONVEX_URL=' "$ROOT/.env.local" | head -n 1 | cut -d= -f2-)
site_url=$(grep -E '^NEXT_PUBLIC_CONVEX_SITE_URL=' "$ROOT/.env.local" | head -n 1 | cut -d= -f2-)

case "$deployment" in
  anonymous:?*) ;;
  *)
    echo "FAIL doctor: CONVEX_DEPLOYMENT=$deployment (expected anonymous:<name>)" >&2
    exit 1
    ;;
esac
expected_instance=${deployment#anonymous:}
if [ "$convex_url" != "$CONVEX_URL_DEFAULT" ]; then
  echo "FAIL doctor: NEXT_PUBLIC_CONVEX_URL=$convex_url (expected $CONVEX_URL_DEFAULT)" >&2
  exit 1
fi
if [ "$site_url" != "$CONVEX_SITE_URL_DEFAULT" ]; then
  echo "FAIL doctor: NEXT_PUBLIC_CONVEX_SITE_URL=$site_url (expected $CONVEX_SITE_URL_DEFAULT)" >&2
  exit 1
fi

instance=$(curl -fsS --max-time 5 "$convex_url/instance_name")
running=$(curl -fsS --max-time 5 "$convex_url/")
if [ "$instance" != "$expected_instance" ]; then
  echo "FAIL doctor: instance_name=$instance (expected $expected_instance from .env.local)" >&2
  exit 1
fi
case "$running" in
  "This Convex deployment is running."*) ;;
  *)
    echo "FAIL doctor: $convex_url/ did not identify a running Convex deployment" >&2
    exit 1
    ;;
esac

signin=$(curl -fsS --max-time 15 "$ORIGIN/sign-in")
case "$signin" in
  *"Qian Inc."*"Sign in with GitHub"*) ;;
  *)
    echo "FAIL doctor: $ORIGIN/sign-in did not contain Qian Inc. and Sign in with GitHub" >&2
    exit 1
    ;;
esac

mkdir -p "$EVIDENCE"
cat >"$EVIDENCE/doctor.txt" <<EOF
PASS doctor
CONVEX_DEPLOYMENT=$deployment
NEXT_PUBLIC_CONVEX_URL=$convex_url
NEXT_PUBLIC_CONVEX_SITE_URL=$site_url
instance_name=$instance
convex_root=$(printf '%s' "$running" | head -n 1)
sign_in=Qian Inc. / Sign in with GitHub
CONVEX_DEPLOY_KEY=unset
EOF
cat "$EVIDENCE/doctor.txt"
