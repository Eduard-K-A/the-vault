update profiles
set role = 'employee'
where role not in ('owner', 'employee');

update business_members
set role = 'employee'
where role not in ('owner', 'employee');

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('profiles'::regclass, 'business_members'::regclass)
      and position(('mana' || 'ger') in lower(pg_get_constraintdef(oid))) > 0
  loop
    execute format('alter table %s drop constraint %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end $$;

alter table business_members
  add constraint business_members_role_check check (role in ('owner', 'employee'));

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and position(('mana' || 'ger') in lower(policyname)) > 0
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

drop policy if exists "owner can manage products" on products;
create policy "owner can manage products"
  on products for all
  using (
    business_id in (
      select business_id
      from business_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "owner can update inventory" on inventory;
create policy "owner can update inventory"
  on inventory for update
  using (
    branch_id in (
      select b.id
      from branches b
      join business_members bm on b.business_id = bm.business_id
      where bm.user_id = auth.uid() and bm.role = 'owner'
    )
  );
