-- Run this once against your Postgres database.
-- Neon: SQL Editor in the console, or `psql "$DATABASE_URL" -f db/schema.sql`

create table if not exists signups (
  id          bigserial   primary key,
  name        text        not null,
  email       text        not null,
  class_year  text,
  major       text,
  experience  text        not null,
  source      text        not null default 'website',
  created_at  timestamptz not null default now()
);

-- one signup per email, case-insensitive
create unique index if not exists signups_email_key on signups (lower(email));
create index if not exists signups_created_at_idx on signups (created_at desc);

-- =====================================================================
-- Members, LeetCode link, sync log, placement.
-- `signups` above stays the public lead list. Identity lives here, and a
-- member only exists after proving they control a LeetCode account.
-- Everything is `if not exists`, so re-running this file is safe.
-- =====================================================================

create table if not exists members (
  id                    bigserial   primary key,
  leetcode_username     text        not null,
  signup_id             bigint      references signups (id) on delete set null,
  display_name          text        not null,
  hide_from_leaderboard boolean     not null default false,
  rank                  text        not null default 'guardian'
                        check (rank in ('guardian', 'archon', 'legend', 'ancient', 'divine')),
  rank_source           text        not null default 'default',   -- default | placement | sync | admin
  status                text        not null default 'ok',        -- ok | not_found | blocked
  last_lc_call_at       timestamptz,
  last_synced_at        timestamptz,
  last_seen_ts          timestamptz,
  gap_possible          boolean     not null default false,
  created_at            timestamptz not null default now()
);
create unique index if not exists members_username_key on members (lower(leetcode_username));
create unique index if not exists members_signup_key on members (signup_id) where signup_id is not null;

-- A one-time "put this code in your LeetCode About me" challenge. Held by the
-- browser that started it (the id is a random secret); the code itself is
-- stored only as a hash.
create table if not exists link_challenges (
  id          text        primary key,
  username    text        not null,
  code_hash   text        not null,
  claim_hash  text,
  attempts    int         not null default 0,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists link_challenges_username_idx on link_challenges (lower(username), created_at desc);

-- Handed out once, when a NEW signup row is created, so the LeetCode link
-- can be attached to the right signup. Single use, hashed, short lived.
create table if not exists signup_claims (
  token_hash  text        primary key,
  signup_id   bigint      not null references signups (id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create table if not exists sessions (
  token_hash   text        primary key,
  member_id    bigint      not null references members (id) on delete cascade,
  verified_at  timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists sessions_member_idx on sessions (member_id);

-- Every Accepted submission we have ever seen. Append-only: LeetCode only
-- shows the latest 20, so we keep our own log. Progress and placement are
-- derived from this at read time. `revoked_at` is a tombstone so an officer's
-- revoke is not undone by the next sync.
create table if not exists ac_events (
  id          bigserial   primary key,
  member_id   bigint      not null references members (id) on delete cascade,
  slug        text        not null,
  ts          timestamptz not null,
  source      text        not null default 'sync',                -- sync | admin
  revoked_at  timestamptz,
  unique (member_id, slug, ts)
);
create index if not exists ac_events_member_slug_idx on ac_events (member_id, slug);

create table if not exists placements (
  id              bigserial   primary key,
  member_id       bigint      not null references members (id) on delete cascade,
  started_at      timestamptz not null default now(),
  ends_at         timestamptz not null,
  problems        jsonb       not null,                            -- one slug per tier, tier 1 first
  snapshot_slugs  jsonb       not null default '[]'::jsonb,
  result_rank     text,
  flagged         boolean     not null default false,              -- Legend or higher: officer may re-test
  finished_at     timestamptz
);
create index if not exists placements_member_idx on placements (member_id, started_at desc);

create table if not exists rank_history (
  id          bigserial   primary key,
  member_id   bigint      not null references members (id) on delete cascade,
  from_rank   text,
  to_rank     text        not null,
  actor       text        not null,                                -- placement | sync | admin
  at          timestamptz not null default now()
);

-- One row. `blocked_until` is the circuit breaker: after LeetCode refuses us
-- (403/429) nothing calls it again until this time passes.
create table if not exists sync_state (
  id             int         primary key default 1 check (id = 1),
  blocked_until  timestamptz,
  lock_until     timestamptz
);
insert into sync_state (id) values (1) on conflict do nothing;

-- Sign up vs sign in. A 'signup' challenge creates the member when the code
-- checks out; a 'signin' challenge only ever signs in to an existing member.
alter table link_challenges add column if not exists intent text not null default 'signup';

-- =====================================================================
-- Study rooms: one chat room per rank. A member reads and posts in a room
-- once they have REACHED that rank (same gate as the problem sets), so a
-- room is never spoiled for someone who has not climbed to it yet, and
-- everyone who can see it has already earned the right to.
-- =====================================================================

alter table members add column if not exists last_chat_at timestamptz;
alter table members add column if not exists chat_muted_until timestamptz;

create table if not exists chat_messages (
  id          bigserial   primary key,
  rank        text        not null
                        check (rank in ('guardian', 'archon', 'legend', 'ancient', 'divine')),
  member_id   bigint      not null references members (id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now(),
  -- A soft delete: the row (and its id, so ids stay a stable cursor) stays,
  -- the body is cleared, and who removed it is kept for moderation history.
  deleted_at  timestamptz,
  deleted_by  text                                                    -- author | admin
);
create index if not exists chat_messages_room_idx on chat_messages (rank, id desc);
create index if not exists chat_messages_member_idx on chat_messages (member_id, id desc);

-- A message can be a plain message, a member sharing a progress snapshot
-- (numbers computed server-side, never taken from the client), or an
-- officer's announcement (no member behind it, so member_id is nullable).
-- `problem_slug` is an optional tag on a 'message' row — "here's the one I'm
-- stuck on" — validated against that room's own set. `meta` is free-form
-- (the progress snapshot's numbers); nothing sensitive, so it is cleared on
-- delete along with the body, not kept around.
alter table chat_messages add column if not exists kind text not null default 'message'
  check (kind in ('message', 'progress', 'announcement'));
alter table chat_messages add column if not exists problem_slug text;
alter table chat_messages add column if not exists meta jsonb;
alter table chat_messages alter column member_id drop not null;
create index if not exists chat_messages_announce_idx on chat_messages (rank, id desc)
  where kind = 'announcement' and deleted_at is null;
