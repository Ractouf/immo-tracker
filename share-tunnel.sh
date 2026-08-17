#!/usr/bin/env bash
# Lance un tunnel Cloudflare public temporaire vers l'app de partage (port 3001).
# Nécessite que `npm run start:dev` tourne déjà dans server/.
# L'URL publique (aléatoire à chaque lancement) s'affiche dans les logs ci-dessous.
cloudflared tunnel --url http://localhost:3001
