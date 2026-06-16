alter table if exists sales
add column if not exists sync_status text not null default 'sync_pending';

alter table if exists sales
add column if not exists sync_attempt_count integer not null default 0;

alter table if exists sales
add column if not exists last_sync_error_code text;

alter table if exists sales
add column if not exists last_sync_error_message text;

alter table if exists sales
add column if not exists last_sync_error_at timestamptz;

alter table if exists sales
add column if not exists last_sync_attempt_at timestamptz;

alter table if exists sales
add column if not exists server_confirmed_at timestamptz;

update sales
set idempotency_key = id
where idempotency_key is null;

alter table if exists sales
alter column idempotency_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sales_sync_status_check'
  ) then
    alter table sales
    add constraint sales_sync_status_check
    check (sync_status in ('local_only', 'sync_pending', 'syncing', 'synced', 'sync_failed', 'needs_review'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sales_sync_attempt_count_check'
  ) then
    alter table sales
    add constraint sales_sync_attempt_count_check
    check (sync_attempt_count >= 0);
  end if;
end $$;

drop index if exists sales_idempotency_key_idx;

create unique index if not exists sales_business_id_idempotency_key
on sales(business_id, idempotency_key);

alter table if exists payments
add column if not exists branch_id uuid references branches(id);

alter table if exists payments
add column if not exists status text not null default 'paid';

alter table if exists payments
add column if not exists provider text;

alter table if exists payments
add column if not exists provider_reference text;

alter table if exists payments
add column if not exists offline_approved boolean not null default false;

alter table if exists payments
add column if not exists created_at timestamptz not null default now();

alter table if exists payments
add column if not exists synced_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_status_check'
  ) then
    alter table payments
    add constraint payments_status_check
    check (status in ('pending', 'authorized', 'captured', 'paid', 'failed', 'refunded', 'partially_refunded'));
  end if;
end $$;

create unique index if not exists payments_business_provider_reference
on payments(business_id, provider, provider_reference)
where provider_reference is not null;

alter table if exists inventory_logs
add column if not exists business_id uuid references businesses(id);

update inventory_logs il
set business_id = p.business_id
from products p
where il.product_id = p.id
  and il.business_id is null;

update inventory_logs il
set business_id = b.business_id
from branches b
where il.branch_id = b.id
  and il.business_id is null;

alter table if exists inventory_logs
alter column business_id set not null;

alter table if exists inventory_logs
add column if not exists reason text;

alter table if exists inventory_logs
add column if not exists synced_at timestamptz;

create or replace function public.can_access_branch(target_branch_id uuid, target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.branches b
    where b.id = target_branch_id
      and b.business_id = target_business_id
      and public.can_access_business(target_business_id)
  );
$$;

revoke all on function public.can_access_branch(uuid, uuid) from public;
grant execute on function public.can_access_branch(uuid, uuid) to authenticated;

alter table if exists sales enable row level security;
alter table if exists sale_items enable row level security;
alter table if exists payments enable row level security;
alter table if exists refunds enable row level security;
alter table if exists refund_items enable row level security;
alter table if exists inventory_logs enable row level security;
alter table if exists audit_logs enable row level security;

drop policy if exists "members can read sales" on sales;
create policy "members can read sales"
  on sales for select
  using (public.can_access_business(business_id) and public.can_access_branch(branch_id, business_id));

drop policy if exists "members can read sale items" on sale_items;
create policy "members can read sale items"
  on sale_items for select
  using (public.can_access_business(business_id));

drop policy if exists "members can read payments" on payments;
create policy "members can read payments"
  on payments for select
  using (public.can_access_business(business_id));

drop policy if exists "members can read inventory logs" on inventory_logs;
create policy "members can read inventory logs"
  on inventory_logs for select
  using (public.can_access_business(business_id) and public.can_access_branch(branch_id, business_id));

drop policy if exists "members can read refunds" on refunds;
create policy "members can read refunds"
  on refunds for select
  using (public.can_access_business(business_id) and public.can_access_branch(branch_id, business_id));

drop policy if exists "members can read refund items" on refund_items;
create policy "members can read refund items"
  on refund_items for select
  using (
    exists (
      select 1
      from refunds r
      where r.id = refund_items.refund_id
        and public.can_access_business(r.business_id)
        and public.can_access_branch(r.branch_id, r.business_id)
    )
  );

drop policy if exists "members can read audit logs" on audit_logs;
create policy "members can read audit logs"
  on audit_logs for select
  using (public.can_access_business(business_id));
