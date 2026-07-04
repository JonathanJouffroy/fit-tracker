-- Table pour stocker les tokens OAuth des intégrations tierces
create table if not exists integrations (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  provider text not null default 'google_fit',
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table integrations enable row level security;

create policy "user integrations" on integrations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
