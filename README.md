# Immo Tracker

Suivi des annonces Immoweb avec système Oui/Non et suivi de prix.

## Démarrer

Backend (port 3000) :

```bash
cd server
npm run dev
```

Frontend (port 5500, proxy `/api` → backend) :

```bash
cd app
npm run dev
```

Ouvrir **http://localhost:5500**.

## Fonctionnement

- Bouton **Synchroniser** : va chercher les annonces Immoweb correspondant aux recherches Immoweb actives, et met à jour le stockage local (`server/data/listings.json`, aucune base de données).
- Onglets : **À trier**, **Oui**, **Peut-être**, **Non**, **Disparues**.
- Une annonce "disparue" n'est détectée qu'à partir de la **2e synchronisation**.

## Partager tes Oui / Peut-être avec un tiers

Le backend lance aussi une app séparée sur le **port 3001**, sans aucune route admin (pas de sync/merge/statuts) — c'est la seule à exposer publiquement. Le bouton **Partager** dans l'app admin donne le lien (`http://localhost:3001/<token>`) et permet de le régénérer.

Pour le rendre accessible à quelqu'un d'autre, installe `cloudflared` une fois (`brew install cloudflared`), puis :

```bash
./share-tunnel.sh
```

Ça affiche une URL publique `https://xxxx.trycloudflare.com` (aléatoire à chaque lancement, gratuite, aucun compte requis). Remplace `localhost:3001` par cette URL dans le lien copié depuis l'app, envoie-le, et arrête le script (`Ctrl+C`) une fois terminé.
