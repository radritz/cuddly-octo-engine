# HomeOS

Private PWA-first household management for roommates. HomeOS tracks shared
inventory, gym pantry stock, recurring bills, expenses, settlements, and member
balances.

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS 4
- React Router 7
- Supabase Auth, Postgres, Realtime, and Storage
- Zustand
- Vitest and Playwright
- Vercel-ready SPA deployment

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Set these values in `.env`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/202605300001_homeos_schema.sql`.
3. Enable Google OAuth in Supabase Auth.
4. Add these redirect URLs:
   - Local: `http://localhost:5173/auth/callback`
   - Vercel: `https://your-vercel-domain/auth/callback`
5. Seed the first allowed roommate email before anyone signs up:

```sql
insert into public.allowed_emails (email)
values ('your.email@example.com');
```

6. In Supabase Auth Hooks, configure the before-user-created hook to call:

```sql
public.before_user_created_allowlist
```

That hook rejects accounts whose email is not present in `allowed_emails`.
Invite codes are secondary; a code alone does not grant app access.

## Security Model

- The database is the security boundary.
- All app tables have RLS enabled.
- Reads and writes require `auth.uid()` to map to an active member of the
  target household.
- Admin mutations are guarded by SQL functions and RLS policies.
- Deactivation prevents removing the last active admin.
- Historical expense splits are immutable by design.
- PWA caching is limited to static app assets, not household financial data.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test:unit
pnpm test:e2e
```

Unit and e2e tests are included but were not executed during implementation per
request.

## Deployment

Deploy to Vercel as a Vite app.

- Build command: `pnpm build`
- Output directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel project
  settings.
- `vercel.json` includes SPA rewrites and baseline security headers.

## Notes

The Members page allowlists roommate emails. Sending invite emails requires a
trusted server-side function with a Supabase service role key; do not expose a
service role key in the Vite frontend.
