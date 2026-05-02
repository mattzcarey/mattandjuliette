# Matt & Juliette

Single React/Vite SPA deployed as one Cloudflare Worker.

## Routes

- `/` — house booking page
- `/admin` — password-protected host dashboard
- `/api/*` — Worker API backed by D1 + Drizzle

## Commands

```bash
npm install
npm run dev
npm run build
npm run deploy
```

## Database

D1 database: `mattandjuliette-db`

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## Secrets

Required Worker secrets:

- `ADMIN_PASSWORD`
- `AUTH_SECRET`

Local `.env` is ignored by git. Upload with:

```bash
npx wrangler secret bulk .env
```
