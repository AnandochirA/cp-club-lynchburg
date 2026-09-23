# Competitive Programming Club — University of Lynchburg

One-page recruiting site. Next.js 15 (App Router) + Tailwind 4 + TypeScript.
The join form writes real signups to Postgres.

## Run it

```bash
npm install
cp .env.example .env.local    # already filled in if you got .env.local with the project
npm run dev                   # http://localhost:3000
```

## Environment

| Variable       | What it is                                                                |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | Any Postgres connection string. The project ships pointed at a Neon database named `cp-club-lynchburg`. |
| `ADMIN_TOKEN`  | A long random string. Anyone with it can read the signup list, so treat it like a password. |

`.env.local` is gitignored. When you deploy, paste both values into your host's
environment variables instead.

## The database

One table. Create it with:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

…or paste `db/schema.sql` into the Neon SQL editor. Emails are unique
case-insensitively, so the same person signing up twice is not an error — the
API returns `duplicate: true` and the form still says "You're in."

## Who has signed up

- **`/admin?token=YOUR_ADMIN_TOKEN`** — a plain table, newest first.
- **`GET /api/signup?token=YOUR_ADMIN_TOKEN`** — the same rows as JSON, for
  importing into a spreadsheet.

Both refuse to answer without the token, and the page is marked `noindex`.

## Editing the site

**All copy lives in `src/lib/content.ts`.** Headlines, FAQ answers, rank names
and topics, ICPC rosters, event details, leadership — change them there and the
page follows. You should not need to open a component to change words.

Anything in `[square brackets]` is a placeholder waiting on a real value:

| Placeholder             | Where                                     |
| ----------------------- | ----------------------------------------- |
| `[Day]`, `[Time]`       | study room hours — `events.featured`      |
| `[Room/Building]`       | where the study room meets                |
| `[Host site]`           | ICPC regional location — `icpc.meta`      |
| `[Name]` ×3             | ICPC rosters — `icpc.teams`               |
| `[Major · Class year]`  | leadership cards — `leadership.people`    |
| `[Another event]`       | the spare event slot — `events.upcoming`  |
| `club.discordUrl`       | set to your real Discord invite           |

## Structure

```
src/
  app/
    page.tsx              composes the sections in order
    layout.tsx            fonts + metadata
    globals.css           design tokens, component classes, animations
    api/signup/route.ts   POST = join, GET = the list (token-gated)
    admin/page.tsx        the signup table
  components/             one file per section
  lib/
    content.ts            all copy and data
    db.ts                 Postgres connection
    submit.ts             where a signup goes
db/schema.sql
```

## Design notes

- Mobile first. The desktop layout starts at the `lg:` breakpoint (1024px).
- Colours and fonts are Tailwind theme tokens in `globals.css` — `bg-ink`,
  `text-gold`, `font-display` and so on. Change them in one place.
- Sections fade in on scroll using CSS `animation-timeline: view()`. Browsers
  without it simply show the content; nothing is ever stuck invisible.
- `prefers-reduced-motion: reduce` turns all of it off.

## Deploying

Vercel is the least work: push to GitHub, import the repo, add `DATABASE_URL`
and `ADMIN_TOKEN` as environment variables, deploy. Any host that runs Node
works too — `npm run build && npm start`.

### The static preview

`npm run build:preview` produces `out/`, a plain static copy with no server.
The API route and `/admin` are excluded, because a static export has nowhere to
run them. The preview's form writes to its host page's document store instead of
Postgres, so signups collected there live with the preview, not in your
database. Use the real deployment for anything you care about keeping.
