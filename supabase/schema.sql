create table if not exists profiles (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key,
  payload jsonb not null,
  status text not null check (status in ('Pending', 'Saved', 'Applied', 'Interview', 'Rejected', 'Offer')),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);
