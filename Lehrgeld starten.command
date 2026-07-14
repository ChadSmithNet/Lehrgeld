#!/bin/bash
# Lehrgeld ohne Terminal starten (macOS).
# Doppelklick im Finder genügt. Dieses Fenster offen lassen, solange die App
# läuft — zum Beenden das Fenster schließen oder Strg+C drücken.

cd "$(dirname "$0")" || exit 1

# Beim ersten Start: Abhängigkeiten holen und App bauen.
[ -d node_modules ] || npm install
[ -d .next ] || npm run build

# Browser öffnen, sobald der Server bereit ist.
( sleep 3; open http://localhost:3000 ) &

npm start
