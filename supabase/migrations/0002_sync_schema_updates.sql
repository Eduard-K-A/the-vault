alter table if exists business_members
add column if not exists is_active boolean not null default true;

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 10,
  updated_at timestamptz default now(),
  unique (product_id, branch_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  method text not null,
  amount_peso numeric(10,2) not null
);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  original_sale_id uuid not null references sales(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  reason text not null,
  total_peso numeric(10,2) not null,
  created_at timestamptz default now(),
  created_by uuid not null references profiles(id) on delete cascade,
  source_device_id text not null,
  reference_number text not null
);

create table if not exists refund_items (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references refunds(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null
);
