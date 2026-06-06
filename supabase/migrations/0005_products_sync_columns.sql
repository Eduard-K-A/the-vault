alter table if exists products
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists products
add column if not exists is_archived boolean not null default false;

alter table if exists products
add column if not exists version integer not null default 1;

alter table if exists products
add column if not exists description text;

alter table if exists products
add column if not exists created_by uuid references auth.users(id);

alter table if exists products
add column if not exists last_modified_by uuid references auth.users(id);
