# AGENTS.md

## Current project state

This repo is a single Cloudflare Workers application for `house.mattandjuliette.com`.

- Frontend: React + Vite SPA
- Routing: TanStack Router
- UI primitive layer: Base UI (`@base-ui/react`)
- Styling: Tailwind CSS v4
- Worker runtime: Cloudflare Workers via `@cloudflare/vite-plugin`
- Static assets: Workers Assets with SPA fallback
- API: Worker routes under `/api/*` using `run_worker_first`
- Database: Cloudflare D1 with Drizzle schema in `src/db/schema.ts`
- Email: Cloudflare Email Sending binding `SEND_EMAIL`
- Bot protection: Cloudflare Turnstile + honeypot on booking requests
- Admin auth: password login with signed HttpOnly cookie

## Routes

- `/` — public house booking page
- `/admin` — password-protected host dashboard
- `/api/bookings` — create/list booking requests
- `/api/bookings/:id/approve` — approve a pending request
- `/api/blocked-dates` — list/create blocked date ranges
- `/api/admin/login` — admin password login
- `/api/admin/logout` — logout
- `/api/admin/session` — session check

## Commands

Use npm only.

```bash
npm install
npm run dev
npm run build
npm run deploy
npm run cf-typegen
npm run db:migrate:local
npm run db:migrate:remote
```

## Cloudflare configuration

`wrangler.jsonc` is the source of truth.

Important details:

- Custom domain is configured in `routes`.
- Static assets are configured with `not_found_handling: "single-page-application"`.
- Worker should only run first for API routes:

```jsonc
"run_worker_first": ["/api/*"]
```

Do not manually serve `env.ASSETS.fetch(request)` from the Worker.

## Secrets

Local `.env` is ignored by git. Required secrets/vars:

- `ADMIN_PASSWORD`
- `AUTH_SECRET`
- `TURNSTILE_SECRET_KEY`
- `VITE_TURNSTILE_SITE_KEY`

Upload Worker secrets with:

```bash
npx wrangler secret bulk .env
```

Note: `VITE_TURNSTILE_SITE_KEY` is public and baked into the client build.

## Code rules

- Keep the app small. Do not add frameworks or backend services without a clear need.
- No `any`. Use `unknown` and narrow when necessary.
- All functions should have explicit return types.
- Validate API inputs with Zod in `src/worker.ts`.
- Use Drizzle for all D1 access.
- Use the shared Base UI-backed `Button` component from `src/components/button.tsx` for all button elements.
- Keep public routes and admin/API responsibilities clearly separated.
- Do not commit `.env`, `dist`, `.wrangler`, `.tanstack`, or `node_modules`.
- Run `npm run build` before deploying.
- Run `npm run cf-typegen` after changing `wrangler.jsonc` bindings.

## Deployment

Deploy with:

```bash
npm run deploy
```

The Cloudflare Vite plugin generates the Worker build and redirected Wrangler config in `dist/`.
