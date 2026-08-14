# Immo Tracker

Suivi des annonces Immoweb (maisons, communes bruxelloises 1000/1030/1040/1050/1060/1150/1160/1170/1200, max 600 000€) avec système Oui/Non persistant et suivi de prix.

## Démarrer

Backend (port 3000) :

```bash
cd server
npm run start:dev
```

Frontend (port 5500, proxy `/api` → backend) :

```bash
cd app
npm run dev
```

Ouvrir **http://localhost:5500**.

## Fonctionnement

- Bouton **Synchroniser** : va chercher les annonces Immoweb correspondant au filtre (défini en dur dans `server/src/listings/immoweb.service.ts`), et met à jour le stockage local (`server/data/listings.json`, aucune base de données).
- Onglets : **À trier** (nouvelles, pas encore de réponse), **Oui**, **Peut-être**, **Non** (masqués par défaut derrière cet onglet), **Disparues** (l'annonce n'apparaît plus dans la recherche — le badge passe à "Vendu" si Immoweb le confirme sur la page individuelle).
- Une annonce "disparue" n'est détectée qu'à partir de la **2e synchronisation** (il faut un premier état pour comparer).
- Si le prix affiché change entre deux synchronisations, l'historique est conservé (`priceHistory` dans les données, pas encore affiché dans l'UI — à ajouter si utile).

## Modifier le filtre de recherche

Édite les constantes `SEARCH_PARAMS` dans `server/src/listings/immoweb.service.ts` (communes, prix max, type de bien) si tes critères changent.
