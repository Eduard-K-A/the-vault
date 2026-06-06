alter table if exists branches
add column if not exists created_at timestamptz not null default now();

alter table if exists branches
add column if not exists updated_at timestamptz not null default now();
