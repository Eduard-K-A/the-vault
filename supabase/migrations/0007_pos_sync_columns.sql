alter table if exists sales
add column if not exists reference_number text;

alter table if exists sales
add column if not exists vat_amount numeric(12,2) not null default 0;

alter table if exists sales
add column if not exists idempotency_key uuid;

create unique index if not exists sales_idempotency_key_idx
on sales(idempotency_key)
where idempotency_key is not null;

alter table if exists sale_items
add column if not exists business_id uuid references businesses(id) on delete cascade;

update sale_items si
set business_id = s.business_id
from sales s
where si.sale_id = s.id
  and si.business_id is null;

alter table if exists payments
alter column amount_peso type numeric(12,2);

alter table if exists refunds
alter column total_peso type numeric(12,2);

alter table if exists refund_items
alter column unit_price type numeric(12,2);

alter table if exists refund_items
alter column subtotal type numeric(12,2);

alter table if exists audit_logs
add column if not exists branch_id uuid references branches(id) on delete set null;

alter table if exists audit_logs
add column if not exists source_device_id text;
