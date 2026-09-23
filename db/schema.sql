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
