# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server (use `dev:turbo` for Turbopack).
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — ESLint (Next.js flat config, `.eslintrc.json` + `eslint-config-next`).
- No test runner is configured.
- Package manager: both `package-lock.json` and `pnpm-lock.yaml` exist; Vercel uses npm (`installCommand: npm install` in `vercel.json`). Prefer npm to keep lockfiles aligned.
- Secrets live in `.env.local` (see `.env.example`). The MCP/Cursor process reads `SUPABASE_PROJECT_REF` from the OS environment, not `.env.local`.

## Stack

Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS, Radix UI primitives, Framer Motion, `lucide-react` icons. Supabase (DB + Auth + Edge Functions). Path alias `@/* → src/*`. See `AI_RULES.md` for styling/component conventions (always use `cn()` from `src/lib/utils.ts`; reusable UI in `src/components/ui/`, feature components under `src/components/<feature>/`).

## Architecture

This is a single-product checkout funnel ("Camisa do Brasil") with a Pix gateway and an internal admin dashboard. Three concerns are intertwined and worth holding in mind:

### 1. Public funnel (`src/app/{page,carrinho,checkout,pos-compra,rastreio}`)
The home page (`src/app/page.tsx` + `home-page-client.tsx`) renders the landing; navigation moves the user through `/carrinho` → `/checkout` (with `/checkout/retencao` as a downsell) → `/pos-compra` (upsells + Pix status) → `/rastreio`. Pricing/offer logic is centralized in `src/lib/offer-pricing.ts`, `pos-compra-upsell-pricing.ts`, and size selection in `cart-sizes.ts`. State that must survive page transitions uses `sessionStorage` helpers in `checkout-retention-storage.ts` and `pos-compra-pix-storage.ts`. Tracking pixels (Meta, Clarity, UTMify) are wired through `tracking-utils.ts`, `meta-purchase-gate.ts`, and `src/app/providers.tsx`.

### 2. Pix payment flow (Royal Banking gateway)
Pix is created and tracked via two layers:
- **Supabase Edge Functions** in `supabase/functions/{pix-create,pix-status,pix-webhook}` are the source of truth that talk to Royal Banking; the Next app invokes them with `src/lib/supabase/edge-invoke-headers.ts`.
- **Next API routes** (`src/app/api/checkout/card-pending`, `src/app/api/webhooks/royalbanking/pix`) handle "card pending" lead capture and a Next-side webhook receiver (parsing in `src/lib/royalbanking-webhook-parse.ts`, optional `ROYALBANKING_WEBHOOK_SECRET` header check).
- Persistence helpers live in `src/lib/supabase/{pix-payment-store,pending-venda-pix,pending-venda-card,insert-lead-from-checkout,lead-mutations}.ts`. The `SUPABASE_SERVICE_ROLE_KEY` is required server-side for these writes (RLS is closed); never expose it via `NEXT_PUBLIC_*`.
- API contracts are documented in `docs/api-royalbanking-*.md` and SQL schemas in `docs/supabase-*.sql` / `docs/update-db.sql`.

### 3. Admin dashboard (`src/app/admin`)
Password-gated dashboard for sales/leads/clients. Auth is custom (not Supabase Auth):
- `/admin/login` posts the password; `src/lib/admin-auth/session-token.ts` signs an HMAC cookie using `ADMIN_SESSION_SECRET` (min 16 chars), `verify-session.server.ts` validates it on the server.
- `src/middleware.ts` (matcher `/admin/:path*`) does a coarse cookie check and redirects to `/admin/login`. The fine-grained verification happens in the admin layout/server components — keep both layers in sync if you change cookie names.
- Data loaders are in `src/lib/admin/*` and compose Supabase queries from `src/lib/supabase/queries.ts` + `dashboard-kpis.ts`. Routes use the `(dashboard)` route group so `/admin` resolves to `(dashboard)/page.tsx`.
- `/dashboard` and `/dashboard/*` permanently redirect to `/admin` (see `next.config.ts`).

### Supabase clients
Two flavors, do not mix:
- Browser/anon: `src/integrations/supabase/*` and `src/lib/supabase.ts` use `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server with service role: `src/lib/supabase/admin-client.ts` — only import from server code (`server-only` is in deps for guarding).

### Other notes
- `next.config.ts` sets security headers globally, disables `experimental.devtoolSegmentExplorer` (was breaking Fast Refresh in Next 15.5), pins `outputFileTracingRoot` to this dir to avoid picking up a sibling lockfile, and only allows `randomuser.me` as a remote image host.
- `SITE_URL` / `APP_URL` / `NEXT_PUBLIC_APP_URL` are used to build the public webhook URL passed to Royal Banking — localhost cannot receive webhook POSTs, use a tunnel (ngrok) in dev.
- Static assets/art live in `artes/` and `public/`; product copy/data in `src/data/`.
