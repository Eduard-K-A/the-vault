create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  fullname text not null,
  email text not null,
  role text not null default 'employee',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  join_code text unique not null,
  logo_url text,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  is_active boolean default true
);

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'employee', 'manager')),
  branch_id uuid references branches(id) on delete set null,
  joined_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  barcode text,
  sku text,
  selling_price numeric(10,2) not null default 0,
  cost_price numeric(10,2) not null default 0,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 10,
  updated_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  employee_id uuid not null references profiles(id) on delete cascade,
  total_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  payment_method text not null,
  status text not null,
  notes text,
  created_at timestamptz default now(),
  synced_at timestamptz
);

create table if not exists sale_items (
  id uuid primary key,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  action_type text not null,
  quantity_before integer not null,
  quantity_changed integer not null,
  quantity_after integer not null,
  reference_type text not null,
  reference_id uuid,
  performed_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  event_type text not null,
  actor_id uuid not null references profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_members enable row level security;
alter table branches enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table inventory_logs enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "members can read products" on products;
create policy "members can read products"
  on products for select
  using (
    business_id in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

drop policy if exists "owner or manager can manage products" on products;
create policy "owner or manager can manage products"
  on products for all
  using (
    business_id in (
      select business_id
      from business_members
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

drop policy if exists "employee sees own sales" on sales;
create policy "employee sees own sales"
  on sales for select
  using (
    employee_id = auth.uid()
    or business_id in (
      select business_id from businesses where owner_id = auth.uid()
    )
  );

drop policy if exists "active members can create sales" on sales;
create policy "active members can create sales"
  on sales for insert
  with check (
    business_id in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

drop policy if exists "members can read inventory" on inventory;
create policy "members can read inventory"
  on inventory for select
  using (
    branch_id in (
      select b.id
      from branches b
      join business_members bm on b.business_id = bm.business_id
      where bm.user_id = auth.uid()
    )
  );

drop policy if exists "owner or manager can update inventory" on inventory;
create policy "owner or manager can update inventory"
  on inventory for update
  using (
    branch_id in (
      select b.id
      from branches b
      join business_members bm on b.business_id = bm.business_id
      where bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists "owner can update business" on businesses;
create policy "owner can update business"
  on businesses for update
  using (owner_id = auth.uid());

drop policy if exists "owner reads audit logs" on audit_logs;
create policy "owner reads audit logs"
  on audit_logs for select
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
