# Immo Tracker

A personal tool to follow house listings on [Immoweb](https://www.immoweb.be/), the main Belgian real estate site.

Immoweb shows you the listings, but it doesn't remember which ones you've already seen, which you liked, or how their price changed. This app does.

## What it does

- Saves your Immoweb searches and syncs their listings with one click.
- Sort each listing into **Yes**, **Maybe** or **No**. New ones wait in a **To sort** tab.
- Tracks price changes, and spots listings that were removed from Immoweb.
- Merges duplicate listings, for example when two agencies post the same house.
- Stats per real estate agency.

Data is stored in a JSON file (`server/data/listings.json`), with no database. The interface is in French.

## Run it

Needs Node.js. The app uses Font Awesome Pro, which needs a license token to install.

```bash
# Backend, port 3000
cd server && npm install && npm run dev

# Frontend, port 5500
cd app && npm install && npm run dev
```

Open http://localhost:5500.

Built with Angular (frontend) and NestJS (backend), in TypeScript.
