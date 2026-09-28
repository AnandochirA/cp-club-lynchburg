# Competitive Programming Club — University of Lynchburg

Recruiting site plus the club's rank ladder. Next.js 15 (App Router) + Tailwind 4 +
TypeScript. The join form writes real signups to Postgres; after joining, members
link their LeetCode account, take a placement, and have their progress tracked
automatically.

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
| `ADMIN_TOKEN`  | A long random string. Anyone with it can read the signup list and change ranks, so treat it like a password. |

`.env.local` is gitignored. When you deploy, paste both values into your host's
environment variables instead. (`LEETCODE_GRAPHQL_URL` also exists, but only for
testing against a mock LeetCode. Leave it unset in production.)

## The database

Apply `db/schema.sql` **before deploying new code**. It is idempotent (every
statement is `if not exists`), so re-running it is always safe:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

…or paste it into the Neon SQL editor.

| Table            | What it holds                                                               |
| ---------------- | --------------------------------------------------------------------------- |
| `signups`        | The public lead list from the join form. Unique by email (case-insensitive), so signing up twice is not an error: the API returns `duplicate: true`. |
| `members`        | Someone who has proven they control a LeetCode account: rank, sync state.   |
| `ac_events`      | Every Accepted submission we have ever seen. Append-only. Progress is derived from it. |
| `placements`     | Each placement attempt and its result.                                      |
| `sessions`, `link_challenges`, `signup_claims` | Sign-in plumbing. Codes and tokens are stored only as hashes. |
| `rank_history`, `sync_state` | An audit trail of rank changes, and the LeetCode circuit breaker. |

## Who has signed up

- **`/admin?token=YOUR_ADMIN_TOKEN`** — a plain table, newest first.
- **`GET /api/signup?token=YOUR_ADMIN_TOKEN`** — the same rows as JSON, for
  importing into a spreadsheet.

Both refuse to answer without the token, and the page is marked `noindex`.

## Ranks, placement and tracking

Five ranks, **250 problems**, about ten a week:

| Rank     | Problems | Topics                                                     |
| -------- | -------- | ---------------------------------------------------------- |
| Guardian | 50       | Python syntax, arrays, strings                             |
| Archon   | 50       | two pointers, stack, linked list                           |
| Legend   | 50       | binary search, sliding window                              |
| Ancient  | 70       | trees, tries, heap, backtracking, graphs, dynamic programming |
| Divine   | 30       | LeetCode Hards, plus proof of a passed company assessment (approved by an officer) |

**The member's journey.** Join form → a popup with the roadmap → link LeetCode →
placement (or skip; "Never coded" starts at Guardian) → `/me` to see progress.

**Linking.** A member enters their LeetCode username and gets a one-time code
(`CPCLUB-XXXXXX`). They paste it into their LeetCode "About me"; we read the
public profile and look for it. That proof, never an email, is what creates a
session. It is also how a returning member signs back in.

**Tracking.** We read each member's latest Accepted submissions from LeetCode's
public (unofficial) GraphQL API and keep our own log. Things to know:

- LeetCode only shows the latest **20** Accepted submissions, so we sync often
  and flag `gap_possible` if a member solved more than 20 between looks.
- Only solves **after linking** count. Re-solving old problems is encouraged
  anyway (redo what you needed help on after 1, 3 and 7 days).
- We see Accepted submissions only: no attempts, no time spent, no code.
- It is an unofficial API and can refuse us. If it returns 403/429 a circuit
  breaker pauses all calls for ten minutes, and a failed sync is never treated
  as "zero solves".

**Levelling up.** Every sync checks whether the member's current rank has all of
its problems solved, and if so promotes them (repeating if they finished several
sets). It only ever goes up, records each step in `rank_history`, and **stops at
Ancient**: Divine needs 30 Hards *and* an officer-approved assessment, so an
officer awards it with `set_rank`. Once Ancient is finished, `/me` switches to
showing the 30 Divine Hards as the target. Syncs run when a member presses
**Sync now** on `/me`, during a placement, and when an officer grants a solve.
There is no scheduled background sync yet, so someone who never opens the site
is not re-checked.

**Placement.** Four problems, one per tier, picked on the server at Start from a
pool the browser never sees (`src/lib/placement-pool.ts`, server-only). 90 minutes
from Start; a tier counts if LeetCode shows an Accepted submission for its problem
inside the window. Start rank = one above the number of tiers passed *in a row*
from the bottom, capped at Ancient. One attempt per 30 days. Placement can only
**raise** a rank (it never lowers one already earned) and never overrides a rank
an officer set by hand. Legend or higher is flagged for an optional officer
re-test (the code proves control of an account, not who was typing).

### Officer tools

Header-authenticated only (a `?token=` query string leaks into logs):

```bash
# list members: rank, solved count, placement result, flagged?
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-SITE/api/admin/members

# actions: set_rank | grant_solve | revoke_solve | link_signup | delete
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"action":"set_rank","username":"their_leetcode_name","rank":"legend"}' \
  https://YOUR-SITE/api/admin/members
```

`revoke_solve` is a tombstone, so the next sync does not quietly bring the solve
back. `grant_solve` promotes the member if it completes their rank's set. Divine
approval is done with `set_rank` for now.

### Changing the problem lists

The lists live in **`scripts/build-curriculum.mjs`**. Edit them, then run:

```bash
node scripts/build-curriculum.mjs
```

It checks every problem against LeetCode (exists, free, number matches, counts are
50/50/50/70/30, all Divine problems are Hard, the placement pool has 8+ per tier
and none overlap the ladder) and only then rewrites `src/lib/curriculum.ts` and
`src/lib/placement-pool.ts`. Never edit those two files by hand.

### Before relying on tracking: check LeetCode will talk to your host

Datacenter IPs are the ones most likely to be refused, and a laptop test cannot
show that. After deploying:

1. `curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://YOUR-SITE/api/admin/leetcode-probe?n=8"`
   — `blocked` should be `0`.
2. On GitHub: Actions → **LeetCode reachability probe** → Run workflow.

If either is blocked, syncing has to run from somewhere else.

### Testing without a LeetCode account

Point the app at a mock with `LEETCODE_GRAPHQL_URL=http://127.0.0.1:4010/graphql`
and answer the three queries in `src/lib/leetcode.ts` (`matchedUser`,
`recentAcSubmissionList`, and a `question` probe). That is how the flow was tested
end to end.

## Editing the site

**All copy lives in `src/lib/content.ts`.** Headlines, FAQ answers, rank names
and topics, event details, leadership, the popup and profile text — change them
there and the page follows. You should not need to open a component to change
words. Rank sizes come from the generated curriculum, so they cannot drift from
the real lists.

Anything in `[square brackets]` is a placeholder waiting on a real value. There
are none left; the Week and Events sections currently say "coming soon".

The study room card in **Events** currently reads "Coming Soon". When the
schedule is set, change `events.featured.every` / `day` / `time` (e.g. `Every` /
`Thursday` / `6:00 PM`) and add a location row to `events.featured.meta`. Extra
events go in `events.upcoming`; while it is empty the study room card runs full
width. Set the same details in `week.when`.

There is no Discord link or ICPC section right now. To bring a Discord button
back, add a `discordUrl` to `club` and a link in `JoinForm.tsx`.

## Structure

```
src/
  app/
    page.tsx                    composes the sections in order
    layout.tsx                  fonts + metadata
    globals.css                 design tokens, component classes, animations
    me/page.tsx                 a member's rank and progress
    admin/page.tsx              the signup table
    api/
      signup/                   POST = join, GET = the list (token-gated)
      leetcode/{link,verify}/   the About-me code proof
      me/                       who am I, sync now, sign out, delete my data
      placement/[action]/       start | poll | finish
      admin/                    members list + officer actions, LeetCode probe
  components/                   one file per section, plus RoadmapDialog,
                                LinkLeetCode, PlacementPanel, MemberDashboard
  lib/
    content.ts                  all copy and data
    curriculum.ts               GENERATED: the 250 problems
    placement-pool.ts           GENERATED, server-only: placement problems
    leetcode.ts                 the only module that talks to LeetCode
    sync.ts                     pull + store submissions, circuit breaker
    placement.ts                the placement engine (rules in placement-logic.ts)
    session.ts, admin.ts, request.ts, verify-code.ts
    db.ts                       Postgres connection
    submit.ts                   where a signup goes
scripts/
  build-curriculum.mjs          validates + regenerates the problem lists
  build-preview.mjs             the static preview build
.github/workflows/leetcode-probe.yml
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
works too — `npm run build && npm start`. Apply `db/schema.sql` first (see above).

### The static preview

`npm run build:preview` produces `out/`, a plain static copy with no server.
The API routes, `/admin` and `/me` are excluded, because a static export has
nowhere to run them, so the popup shows the roadmap only. The preview's form
writes to its host page's document store instead of Postgres, so signups
collected there live with the preview, not in your database. Use the real
deployment for anything you care about keeping. If you add another page that
reads the database or cookies, add it to the exclusion list in
`scripts/build-preview.mjs`.
