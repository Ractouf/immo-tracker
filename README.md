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
