create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_id = auth.uid()
      and coalesce(b.is_active, true)
  )
  or exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.user_id = auth.uid()
      and coalesce(bm.is_active, true)
  );
$$;

revoke all on function public.can_access_business(uuid) from public;
grant execute on function public.can_access_business(uuid) to authenticated;

drop policy if exists "members can read businesses" on businesses;
create policy "members can read businesses"
  on businesses for select
  using (public.can_access_business(id));

drop policy if exists "members can read business members" on business_members;
create policy "members can read business members"
  on business_members for select
  using (public.can_access_business(business_id));

drop policy if exists "members can read branches" on branches;
create policy "members can read branches"
  on branches for select
  using (public.can_access_business(business_id));

drop policy if exists "members can read categories" on categories;
create policy "members can read categories"
  on categories for select
  using (public.can_access_business(business_id));

drop policy if exists "members can read products" on products;
create policy "members can read products"
  on products for select
  using (public.can_access_business(business_id));

alter table if exists inventory_items enable row level security;

drop policy if exists "members can read inventory items" on inventory_items;
create policy "members can read inventory items"
  on inventory_items for select
  using (public.can_access_business(business_id));
