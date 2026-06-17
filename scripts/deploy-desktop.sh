#!/usr/bin/env bash
#
# One-shot build + deploy of AC Intelligence Smartboard to the Desktop.
# Everything destructive (rm -rf of the old app, pkill of the running app) lives
# in here so the whole flow is a single allowlisted command — no per-step prompts.
#
set -uo pipefail
cd "$(dirname "$0")/.."

APP="AC Intelligence Smartboard.app"
DESK="$HOME/Desktop"
FOLDER="$DESK/AC-Intelligence-Smartboard"

echo "▶ Building (electron-vite + electron-builder + sign)…"
npm run pack

echo "▶ Quitting any running instance…"
osascript -e 'tell application "AC Intelligence Smartboard" to quit' 2>/dev/null || true
pkill -f "AC Intelligence Smartboard.app/Contents/MacOS" 2>/dev/null || true
sleep 1

echo "▶ Deploying to Desktop (folder + top level)…"
mkdir -p "$FOLDER"
rm -rf "$FOLDER/$APP" "$DESK/$APP"
ditto "dist/mac-arm64/$APP" "$FOLDER/$APP"
ditto "dist/mac-arm64/$APP" "$DESK/$APP"
for p in "$FOLDER/$APP" "$DESK/$APP"; do
  xattr -dr com.apple.quarantine "$p" 2>/dev/null || true
  codesign --force --deep --sign - "$p" >/dev/null 2>&1 || true
done

echo "▶ Refreshing source copy…"
rsync -a --delete --exclude node_modules --exclude out --exclude dist ./ "$FOLDER/website-cookbook/"

echo "▶ Refreshing icon cache + relaunching…"
touch "$DESK/$APP" "$FOLDER/$APP"
open "$DESK/$APP"

echo "✓ Deployed: $DESK/$APP"
