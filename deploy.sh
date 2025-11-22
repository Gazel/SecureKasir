#!/usr/bin/env bash
set -e

APP_DIR="/root/SecureKasir"
FRONT_DIR="$APP_DIR"          # frontend is in root
BACK_DIR="$APP_DIR/server"

echo "== Backend install =="
cd "$BACK_DIR"
npm install

echo "== Frontend install+build =="
cd "$FRONT_DIR"
npm install
npm run build

echo "== Restart backend service =="
systemctl restart securekasir

echo "== Reload nginx =="
systemctl reload nginx

echo "DEPLOY DONE ✅"
